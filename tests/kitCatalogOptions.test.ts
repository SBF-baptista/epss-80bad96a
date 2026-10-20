import { describe, expect, test } from 'bun:test';
import { getKitCatalogOptions } from '../src/utils/kitCatalogOptions';
import type { ItemType } from '../src/types/homologationKit';

const catalog: { item_name: string; item_type: ItemType }[] = [
  { item_name: 'FMC150', item_type: 'tracker' },
  { item_name: 'ADAS 1080P', item_type: 'camera' },
  { item_name: 'Telemetria Avançada', item_type: 'equipment' },
  { item_name: 'Sirene', item_type: 'accessory' },
  { item_name: 'FITA ISOLANTE', item_type: 'supply' },
  { item_name: 'Módulo cadastrado', item_type: 'module' },
];

describe('kit local catalog', () => {
  test('equipment consists only of registered trackers and cameras', () => {
    expect(getKitCatalogOptions(catalog, ['tracker', 'camera']).map(i => i.item_name))
      .toEqual(['ADAS 1080P', 'FMC150']);
  });
  test.each(['accessory', 'module', 'supply'] as ItemType[])('%s uses only its registered records', (type) => {
    expect(getKitCatalogOptions(catalog, [type])).toEqual(catalog.filter(i => i.item_type === type));
  });
  test('external-only items are never added to the local catalog', () => {
    expect(getKitCatalogOptions([], ['accessory', 'module'])).toEqual([]);
  });
  test('equivalent names are deduplicated without replacing the registered spelling', () => {
    expect(getKitCatalogOptions([
      { item_name: 'Módulo cadastrado', item_type: 'module' },
      { item_name: ' MODULO  CADASTRADO ', item_type: 'module' },
    ], ['module'])).toEqual([{ item_name: 'Módulo cadastrado', item_type: 'module' }]);
  });
});