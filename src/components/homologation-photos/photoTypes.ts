export const photoTypes = [
  { value: 'veiculo', label: 'Foto do Veículo' },
  { value: 'chassi', label: 'Foto do Chassi' },
  { value: 'can_location', label: 'Local de Conexão CAN' },
  { value: 'can_wires', label: 'Fios de Conexão CAN' },
  { value: 'instalacao', label: 'Foto da Instalação' },
  { value: 'homologacao', label: 'Foto da Homologação' },
  { value: 'plataforma_frota', label: 'Foto da plataforma (Frota)' },
  { value: 'outros', label: 'Outros' },
];

export type PhotoType = typeof photoTypes[number]['value'];