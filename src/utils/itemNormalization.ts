/**
 * Utility functions for normalizing item names to ensure consistency
 * across kits, accessories, and supplies
 */

/**
 * Cleans an item name by removing embedded quantity patterns.
 * Handles multiple formats:
 * - "(1x)", "(2x)", etc.
 * - "(qty: 1)", "(qty: 2)", etc.
 * - Extra whitespace
 * 
 * Examples:
 * - "BLOQUEIO (1x)" -> "BLOQUEIO"
 * - "CAMERA EXTRA (qty: 2)" -> "CAMERA EXTRA"
 * - "ID BLUETOOTH  (1x)" -> "ID BLUETOOTH"
 */
export function cleanItemName(name: string): string {
  if (!name) return "";

  return name
    .toString()
    // Normalize whitespace/newlines early
    .replace(/\s+/g, " ")
    // Remove leading bullets or list markers
    .replace(/^[\s•\-–—·\u2022]+/g, "")
    // Remove embedded quantity patterns anywhere in the string
    .replace(/\(\s*\d+\s*x\s*\)/gi, "")
    .replace(/\(\s*qty\s*:\s*\d+\s*\)/gi, "")
    .trim();
}

/**
 * Normalizes an item name by:
 * - Converting to lowercase
 * - Trimming whitespace
 * - Removing accents/diacritics
 * - Normalizing whitespace (multiple spaces to single space)
 * 
 * Examples:
 * - "SIRENE" -> "sirene"
 * - "Sirene  " -> "sirene"
 * - "Relé 12V" -> "rele 12v"
 * - "  Bloqueio  " -> "bloqueio"
 */
export function normalizeItemName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove accents/diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ');
}

/**
 * Checks if two item names are equivalent after normalization
 */
export function areItemNamesEquivalent(name1: string, name2: string): boolean {
  return normalizeItemName(name1) === normalizeItemName(name2);
}

/**
 * Gets the canonical (standardized) version of an item name
 * This uses Title Case for better readability while maintaining consistency
 * 
 * Examples:
 * - "SIRENE" -> "Sirene"
 * - "sirene" -> "Sirene"
 * - "relé 12v" -> "Relé 12v"
 */
export function getCanonicalItemName(name: string): string {
  if (!name) return '';
  
  const normalized = normalizeItemName(name);
  
  // Common mappings for standardization
  const commonMappings: Record<string, string> = {
    'sirene': 'Sirene',
    'bloqueio': 'Bloqueio',
    'rele': 'Relé',
    'rele 12v': 'Relé (12V)',
    'rele 24v': 'Relé (24V)',
    'modulo': 'Módulo',
    'antena': 'Antena',
    'cabo': 'Cabo',
    'conector': 'Conector',
    'suporte': 'Suporte',
    'fita': 'Fita',
    'lacre': 'Lacre',
  };
  
  // Check if we have a direct mapping
  if (commonMappings[normalized]) {
    return commonMappings[normalized];
  }
  
  // Otherwise, capitalize first letter of each word
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Finds an existing item in a list that matches the given name
 * Returns the canonical name if found, or the canonical version of the input if not found
 */
export function findOrCreateCanonicalName(
  itemName: string,
  existingItems: string[]
): string {
  const normalizedInput = normalizeItemName(itemName);
  
  // Try to find a match in existing items
  for (const existingItem of existingItems) {
    if (normalizeItemName(existingItem) === normalizedInput) {
      return existingItem; // Return the existing version
    }
  }
  
  // If no match found, return canonical version
  return getCanonicalItemName(itemName);
}
