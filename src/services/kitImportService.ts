import { CreateKitRequest, HomologationKitItem, ItemType } from '@/types/homologationKit';
import { getCanonicalItemName } from '@/utils/itemNormalization';

export interface ParsedKit {
  name: string;
  equipment: HomologationKitItem[];
  accessories: HomologationKitItem[];
  supplies: HomologationKitItem[];
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  kits: ParsedKit[];
}

/**
 * Parse a line like "Acessórios 2: NOME DO ITEM" or "Insumo 1: NOME"
 * Note: The number does NOT represent quantity, quantity is always 1
 * Returns { itemName }
 */
function parseItemLine(line: string): { itemName: string } | null {
  // Match patterns like "Acessórios 1:", "Insumo 4:", etc
  const match = line.match(/^(Acessórios?|Insumos?)\s+(\d+)\s*:\s*(.+)$/i);
  
  if (match) {
    const itemName = match[3].trim();
    return { itemName };
  }
  
  return null;
}

/**
 * Parse the entire .txt content and extract kits
 */
export function parseKitsTxtFile(content: string): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const kits: ParsedKit[] = [];

  // Split by double newlines to separate kit blocks
  const blocks = content
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(block => block.length > 0);

  if (blocks.length === 0) {
    return {
      isValid: false,
      errors: ['O arquivo está vazio ou não contém dados válidos.'],
      warnings: [],
      kits: [],
    };
  }

  blocks.forEach((block, blockIndex) => {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return;
    }

    // First line should be the kit name (ends with :)
    const firstLine = lines[0];
    if (!firstLine.endsWith(':')) {
      errors.push(`Bloco ${blockIndex + 1}: Nome do kit deve terminar com ":" (encontrado: "${firstLine}")`);
      return;
    }

    const kitName = firstLine.slice(0, -1).trim();
    
    if (!kitName) {
      errors.push(`Bloco ${blockIndex + 1}: Nome do kit não pode ser vazio.`);
      return;
    }

    // Parse equipment (WH: line)
    const equipment: HomologationKitItem[] = [];
    const accessories: HomologationKitItem[] = [];
    const supplies: HomologationKitItem[] = [];

    let hasEquipment = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for WH: (equipment)
      if (line.toUpperCase().startsWith('WH:')) {
        const equipmentName = line.substring(3).trim();
        if (!equipmentName) {
          errors.push(`Kit "${kitName}": Equipamento (WH:) não pode ser vazio.`);
          continue;
        }
        
        equipment.push({
          item_name: getCanonicalItemName(equipmentName),
          item_type: 'equipment',
          quantity: 1,
          description: '',
          notes: '',
        });
        hasEquipment = true;
        continue;
      }

      // Check for Acessórios
      if (line.match(/^Acessórios?\s+\d+\s*:/i)) {
        const parsed = parseItemLine(line);
        if (parsed) {
          accessories.push({
            item_name: getCanonicalItemName(parsed.itemName),
            item_type: 'accessory',
            quantity: 1,
            description: '',
            notes: '',
          });
        } else {
          warnings.push(`Kit "${kitName}": Não foi possível processar a linha: "${line}"`);
        }
        continue;
      }

      // Check for Insumo/Insumos
      if (line.match(/^Insumos?\s+\d+\s*:/i)) {
        const parsed = parseItemLine(line);
        if (parsed) {
          supplies.push({
            item_name: getCanonicalItemName(parsed.itemName),
            item_type: 'supply',
            quantity: 1,
            description: '',
            notes: '',
          });
        } else {
          warnings.push(`Kit "${kitName}": Não foi possível processar a linha: "${line}"`);
        }
        continue;
      }

      // Unknown line format
      warnings.push(`Kit "${kitName}": Linha não reconhecida: "${line}"`);
    }

    // Validate: must have at least WH (equipment)
    if (!hasEquipment) {
      errors.push(`Kit "${kitName}": Deve conter pelo menos um equipamento (linha WH:).`);
      return;
    }

    // Add kit to list
    kits.push({
      name: kitName,
      equipment,
      accessories,
      supplies,
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    kits,
  };
}

/**
 * Convert ParsedKit to CreateKitRequest format
 */
export function convertToCreateRequest(parsedKit: ParsedKit, homologationCardId?: string): CreateKitRequest {
  return {
    homologation_card_id: homologationCardId,
    name: parsedKit.name,
    description: `Importado automaticamente de arquivo TXT`,
    equipment: parsedKit.equipment,
    accessories: parsedKit.accessories,
    supplies: parsedKit.supplies,
  };
}
