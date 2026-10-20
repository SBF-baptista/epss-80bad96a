import type { ItemType } from '@/types/homologationKit';
import { normalizeItemName } from './itemNormalization';

/** Only registered records of the requested categories belong in a kit picker. */
export function getKitCatalogOptions<T extends { item_name: string; item_type: ItemType }>(
  records: T[],
  types: ItemType[],
): T[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = normalizeItemName(record.item_name);
    if (!types.includes(record.item_type) || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.item_name.localeCompare(b.item_name));
}