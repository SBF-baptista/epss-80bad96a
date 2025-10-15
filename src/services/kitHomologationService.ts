import { supabase } from '@/integrations/supabase/client';
import type { HomologationKit, HomologationKitItem } from '@/types/homologationKit';

export interface HomologationStatus {
  isHomologated: boolean;
  pendingItems: {
    equipment: HomologationKitItem[];
    accessories: HomologationKitItem[];
    supplies: HomologationKitItem[];
  };
  homologatedItems: {
    equipment: HomologationKitItem[];
    accessories: HomologationKitItem[];
    supplies: HomologationKitItem[];
  };
}

/**
 * Verifica se um item específico está homologado (existe na tabela kit_item_options)
 */
export async function checkItemHomologation(itemName: string, itemType: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('kit_item_options')
      .select('id')
      .eq('item_name', itemName)
      .eq('item_type', itemType)
      .maybeSingle();

    if (error) {
      console.error('Error checking item homologation:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking item homologation:', error);
    return false;
  }
}

/**
 * Verifica o status de homologação de um kit completo
 */
export async function checkKitHomologationStatus(kit: HomologationKit): Promise<HomologationStatus> {
  try {
    // Buscar todos os itens homologados
    const { data: homologatedItems, error } = await supabase
      .from('kit_item_options')
      .select('item_name, item_type');

    if (error) {
      throw error;
    }

    const homologatedSet = new Set(
      homologatedItems?.map(item => `${item.item_name}:${item.item_type}`) || []
    );

    // Verificar cada categoria de itens do kit
    const pendingItems = {
      equipment: [] as HomologationKitItem[],
      accessories: [] as HomologationKitItem[],
      supplies: [] as HomologationKitItem[]
    };

    const homologatedKitItems = {
      equipment: [] as HomologationKitItem[],
      accessories: [] as HomologationKitItem[],
      supplies: [] as HomologationKitItem[]
    };

    // Processar equipamentos - add safety check
    const equipment = kit.equipment || [];
    equipment.forEach(item => {
      const key = `${item.item_name}:equipment`;
      if (homologatedSet.has(key)) {
        homologatedKitItems.equipment.push(item);
      } else {
        pendingItems.equipment.push(item);
      }
    });

    // Processar acessórios - add safety check
    // IMPORTANTE: Módulos (categories='modulos') não precisam de homologação
    const accessories = kit.accessories || [];
    accessories.forEach(item => {
      // Ignorar módulos - eles não passam por homologação
      const itemDescription = (item.description || '').toLowerCase();
      const isModule = itemDescription.includes('modulo') || itemDescription.includes('módulo');
      if (isModule) {
        // Módulos são automaticamente considerados OK
        homologatedKitItems.accessories.push(item);
        return;
      }
      
      const key = `${item.item_name}:accessory`;
      if (homologatedSet.has(key)) {
        homologatedKitItems.accessories.push(item);
      } else {
        pendingItems.accessories.push(item);
      }
    });

    // Processar insumos - add safety check
    const supplies = kit.supplies || [];
    supplies.forEach(item => {
      const key = `${item.item_name}:supply`;
      if (homologatedSet.has(key)) {
        homologatedKitItems.supplies.push(item);
      } else {
        pendingItems.supplies.push(item);
      }
    });

    const totalPendingItems = 
      pendingItems.equipment.length + 
      pendingItems.accessories.length + 
      pendingItems.supplies.length;

    const isHomologated = totalPendingItems === 0;

    return {
      isHomologated,
      pendingItems,
      homologatedItems: homologatedKitItems
    };
  } catch (error) {
    console.error('Error checking kit homologation status:', error);
    throw error;
  }
}

/**
 * Verifica o status de homologação de múltiplos kits
 */
export async function checkMultipleKitsHomologation(kits: HomologationKit[]): Promise<Map<string, HomologationStatus>> {
  const results = new Map<string, HomologationStatus>();

  try {
    // Buscar todos os itens homologados uma vez
    const { data: homologatedItems, error } = await supabase
      .from('kit_item_options')
      .select('item_name, item_type');

    if (error) {
      throw error;
    }

    const homologatedSet = new Set(
      homologatedItems?.map(item => `${item.item_name}:${item.item_type}`) || []
    );

    // Verificar cada kit
    kits.forEach(kit => {
      if (!kit.id) return;

      const pendingItems = {
        equipment: [] as HomologationKitItem[],
        accessories: [] as HomologationKitItem[],
        supplies: [] as HomologationKitItem[]
      };

      const homologatedKitItems = {
        equipment: [] as HomologationKitItem[],
        accessories: [] as HomologationKitItem[],
        supplies: [] as HomologationKitItem[]
      };

      // Verificar equipamentos - add safety check
      const equipment = kit.equipment || [];
      equipment.forEach(item => {
        const key = `${item.item_name}:equipment`;
        if (homologatedSet.has(key)) {
          homologatedKitItems.equipment.push(item);
        } else {
          pendingItems.equipment.push(item);
        }
      });

      // Verificar acessórios - add safety check
      // IMPORTANTE: Módulos (categories='modulos') não precisam de homologação
      const accessories = kit.accessories || [];
      accessories.forEach(item => {
        // Ignorar módulos - eles não passam por homologação
        const itemDescription = (item.description || '').toLowerCase();
        const isModule = itemDescription.includes('modulo') || itemDescription.includes('módulo');
        if (isModule) {
          // Módulos são automaticamente considerados OK
          homologatedKitItems.accessories.push(item);
          return;
        }
        
        const key = `${item.item_name}:accessory`;
        if (homologatedSet.has(key)) {
          homologatedKitItems.accessories.push(item);
        } else {
          pendingItems.accessories.push(item);
        }
      });

      // Verificar insumos - add safety check
      const supplies = kit.supplies || [];
      supplies.forEach(item => {
        const key = `${item.item_name}:supply`;
        if (homologatedSet.has(key)) {
          homologatedKitItems.supplies.push(item);
        } else {
          pendingItems.supplies.push(item);
        }
      });

      const totalPendingItems = 
        pendingItems.equipment.length + 
        pendingItems.accessories.length + 
        pendingItems.supplies.length;

      const isHomologated = totalPendingItems === 0;

      results.set(kit.id, {
        isHomologated,
        pendingItems,
        homologatedItems: homologatedKitItems
      });
    });

    return results;
  } catch (error) {
    console.error('Error checking multiple kits homologation:', error);
    throw error;
  }
}