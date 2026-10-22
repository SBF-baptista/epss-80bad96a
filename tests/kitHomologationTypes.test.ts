import { describe, expect, test } from 'bun:test';
import { buildHomologatedKeySet, canonicalHomologationType } from '../src/services/kitHomologationService';
import { normalizeItemName } from '../src/utils/itemNormalization';

const homologated = buildHomologatedKeySet([
  { item_name: 'XT40', item_type: 'tracker' },
  { item_name: 'ADAS 1080P', item_type: 'camera' },
  { item_name: 'Sirene', item_type: 'accessory' },
]);

const key = (name: string, type: string) => `${normalizeItemName(name)}:${type}`;

describe('homologação de equipamentos do kit', () => {
  test('rastreador cadastrado conta como equipamento homologado (caso XT40)', () => {
    expect(homologated.has(key('XT40', 'equipment'))).toBe(true);
  });
  test('câmera cadastrada conta como equipamento homologado', () => {
    expect(homologated.has(key('ADAS 1080P', 'equipment'))).toBe(true);
  });
  test('equipamento não cadastrado continua pendente', () => {
    expect(homologated.has(key('GT06', 'equipment'))).toBe(false);
  });
  test('acessório não é promovido a equipamento', () => {
    expect(homologated.has(key('Sirene', 'equipment'))).toBe(false);
    expect(homologated.has(key('Sirene', 'accessory'))).toBe(true);
  });
  test('canonicalHomologationType só mapeia tracker e camera', () => {
    expect(canonicalHomologationType('tracker')).toBe('equipment');
    expect(canonicalHomologationType('camera')).toBe('equipment');
    expect(canonicalHomologationType('accessory')).toBe('accessory');
    expect(canonicalHomologationType('supply')).toBe('supply');
    expect(canonicalHomologationType('module')).toBe('module');
  });
});
