import { HomologationPhoto } from "@/services/homologationService";
import { photoTypes } from "./photoTypes";

export const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "Tamanho desconhecido";
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const getPhotoLabel = (photo: HomologationPhoto) => {
  // First, use the photo_type from database if available
  if (photo.photo_type) {
    const photoTypeMapping = photoTypes.find(type => type.value === photo.photo_type);
    if (photoTypeMapping) {
      return photoTypeMapping.label;
    }
  }

  // Fallback to filename detection for legacy photos
  const lowerFileName = photo.file_name.toLowerCase();
  
  if (lowerFileName.includes('veiculo_') || lowerFileName.includes('vehicle_')) {
    return 'Foto do Veículo';
  } else if (lowerFileName.includes('chassi_') || lowerFileName.includes('chassis_')) {
    return 'Foto do Chassi';
  } else if (lowerFileName.includes('can_location_')) {
    return 'Local de Conexão CAN';
  } else if (lowerFileName.includes('can_wires_')) {
    return 'Fios de Conexão CAN';
  } else if (lowerFileName.includes('foto_homologacao_')) {
    return 'Foto da Homologação';
  } else if (lowerFileName.includes('whatsapp') || lowerFileName.includes('img_') || lowerFileName.includes('image')) {
    return 'Foto da Homologação';
  } else {
    return 'Foto da Homologação';
  }
};