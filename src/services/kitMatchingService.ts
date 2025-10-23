import { supabase } from "@/integrations/supabase/client";
import type { HomologationKit } from "@/types/homologationKit";
import type { KickoffModule } from "./kickoffService";

export interface KitMatch {
  kit: HomologationKit;
  matchScore: number;
  matchedItems: string[];
  missingItems: string[];
}

/**
 * Normaliza strings para comparação (remove acentos, converte para minúsculas, remove espaços extras)
 */
const normalizeString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

/**
 * Verifica se dois itens são similares (considera variações de nomenclatura)
 */
const isSimilarItem = (item1: string, item2: string): boolean => {
  const norm1 = normalizeString(item1);
  const norm2 = normalizeString(item2);
  
  // 1. Verifica se são exatamente iguais
  if (norm1 === norm2) return true;
  
  // 2. Verifica se um contém o outro
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // 3. Mapeamento semântico de equivalências
  const equivalences = [
    // RFID
    ['rfid', 'leitor rfid', 'leitora rfid', 'id condutor rfid', 'condutor rfid'],
    
    // Bloqueio
    ['bloqueio', 'rele', 'relé', 'bloqueio motor', 'bloqueio combustivel', 'bloqueio partida'],
    
    // iButton
    ['ibutton', 'id ibutton', 'condutor ibutton'],
    
    // Sirene
    ['sirene', 'sirene dupla', 'sirene padrao'],
    
    // Bluetooth
    ['bluetooth', 'id bluetooth', 'condutor bluetooth'],
    
    // Sensor
    ['sensor', 'sensor combustivel', 'sensor temperatura'],
  ];
  
  // Verifica se ambos os itens pertencem ao mesmo grupo de equivalência
  for (const group of equivalences) {
    const item1Match = group.some(term => norm1.includes(term));
    const item2Match = group.some(term => norm2.includes(term));
    
    if (item1Match && item2Match) {
      return true;
    }
  }
  
  return false;
};

/**
 * Busca kits cadastrados no sistema
 */
export const fetchAllKits = async (): Promise<HomologationKit[]> => {
  try {
    // Buscar todos os kits
    const { data: kits, error: kitsError } = await supabase
      .from('homologation_kits')
      .select('*')
      .order('name');

    if (kitsError) throw kitsError;
    if (!kits || kits.length === 0) return [];

    // Buscar todos os itens dos kits
    const kitIds = kits.map(k => k.id);
    const { data: items, error: itemsError } = await supabase
      .from('homologation_kit_accessories')
      .select('*')
      .in('kit_id', kitIds);

    if (itemsError) throw itemsError;

    // Agrupar itens por kit
    const kitsWithItems: HomologationKit[] = kits.map(kit => {
      const kitItems = items?.filter(item => item.kit_id === kit.id) || [];
      
      return {
        id: kit.id,
        name: kit.name,
        description: kit.description || undefined,
        equipment: kitItems
          .filter(item => item.item_type === 'equipment')
          .map(item => ({
            id: item.id,
            item_name: item.item_name,
            item_type: 'equipment' as const,
            quantity: item.quantity,
            description: item.description || undefined,
            notes: item.notes || undefined,
          })),
        accessories: kitItems
          .filter(item => item.item_type === 'accessory')
          .map(item => ({
            id: item.id,
            item_name: item.item_name,
            item_type: 'accessory' as const,
            quantity: item.quantity,
            description: item.description || undefined,
            notes: item.notes || undefined,
          })),
        supplies: kitItems
          .filter(item => item.item_type === 'supply')
          .map(item => ({
            id: item.id,
            item_name: item.item_name,
            item_type: 'supply' as const,
            quantity: item.quantity,
            description: item.description || undefined,
            notes: item.notes || undefined,
          })),
        created_at: kit.created_at,
        updated_at: kit.updated_at,
      };
    });

    return kitsWithItems;
  } catch (error) {
    console.error('Error fetching kits:', error);
    return [];
  }
};

/**
 * Compara os módulos/acessórios de um veículo com os itens de um kit
 */
export const matchKitToVehicle = (
  vehicleModules: KickoffModule[],
  kit: HomologationKit
): KitMatch => {
  // Combinar todos os itens do kit (equipment, accessories, supplies)
  const allKitItems = [
    ...kit.equipment.map(e => e.item_name),
    ...kit.accessories.map(a => a.item_name),
    ...kit.supplies.map(s => s.item_name),
  ];

  // Normalizar nomes dos módulos do veículo
  const vehicleItemsNames = vehicleModules.map(m => m.name);

  console.log('🔍 Matching Kit:', kit.name);
  console.log('📦 Kit Items:', allKitItems);
  console.log('🚗 Vehicle Modules:', vehicleItemsNames);

  const matchedItems: string[] = [];
  const missingItems: string[] = [];

  // Para cada item do kit, verificar se existe um item similar no veículo
  for (const kitItem of allKitItems) {
    let found = false;
    for (const vehicleItem of vehicleItemsNames) {
      if (isSimilarItem(kitItem, vehicleItem)) {
        matchedItems.push(kitItem);
        console.log(`✅ Match: "${kitItem}" ≈ "${vehicleItem}"`);
        found = true;
        break;
      }
    }
    if (!found) {
      missingItems.push(kitItem);
      console.log(`❌ Missing: "${kitItem}"`);
    }
  }

  // Calcular score de match (0 a 100)
  // Score = (itens encontrados / total de itens do kit) * 100
  const matchScore = allKitItems.length > 0 
    ? Math.round((matchedItems.length / allKitItems.length) * 100)
    : 0;

  console.log(`📊 Match Score: ${matchScore}%`);

  return {
    kit,
    matchScore,
    matchedItems,
    missingItems,
  };
};

/**
 * Sugere kits compatíveis para um veículo baseado em seus módulos/acessórios
 * Retorna apenas kits com score >= minScore (padrão: 70%)
 */
export const suggestKitsForVehicle = async (
  vehicleModules: KickoffModule[],
  minScore: number = 70
): Promise<KitMatch[]> => {
  const allKits = await fetchAllKits();
  
  if (allKits.length === 0) return [];

  // Calcular match para cada kit
  const matches = allKits.map(kit => matchKitToVehicle(vehicleModules, kit));

  // Filtrar apenas kits com score >= minScore e ordenar por score (maior primeiro)
  return matches
    .filter(match => match.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);
};
