
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Upload, Image, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchHomologationPhotos,
  uploadHomologationPhoto,
  deleteHomologationPhoto,
  getPhotoUrl,
  updatePhotoType,
  HomologationPhoto
} from "@/services/homologationService";

interface HomologationPhotosProps {
  cardId: string;
  onUpdate?: () => void;
}

const HomologationPhotos = ({ cardId, onUpdate }: HomologationPhotosProps) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<HomologationPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<string>('homologacao');
  const [editingPhoto, setEditingPhoto] = useState<HomologationPhoto | null>(null);
  const [editPhotoType, setEditPhotoType] = useState<string>('');

  const photoTypes = [
    { value: 'veiculo', label: 'Foto do Veículo' },
    { value: 'chassi', label: 'Foto do Chassi' },
    { value: 'can_location', label: 'Local de Conexão CAN' },
    { value: 'can_wires', label: 'Fios de Conexão CAN' },
    { value: 'instalacao', label: 'Foto da Instalação' },
    { value: 'homologacao', label: 'Foto da Homologação' },
    { value: 'outros', label: 'Outros' },
  ];

  const loadPhotos = async () => {
    try {
      const data = await fetchHomologationPhotos(cardId);
      setPhotos(data);
    } catch (error) {
      console.error("Error loading photos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar fotos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [cardId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // Create descriptive filename
      const originalName = file.name;
      const extension = originalName.substring(originalName.lastIndexOf('.'));
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const newFileName = `foto_homologacao_${timestamp}${extension}`;
      
      // Create a new file with the descriptive name
      const renamedFile = new File([file], newFileName, { type: file.type });
      
      await uploadHomologationPhoto(cardId, renamedFile, selectedPhotoType);
      await loadPhotos();
      onUpdate?.();
      toast({
        title: "Foto enviada",
        description: "A foto foi enviada com sucesso"
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar foto",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDeletePhoto = async (photo: HomologationPhoto) => {
    try {
      await deleteHomologationPhoto(photo.id, photo.file_path);
      await loadPhotos();
      onUpdate?.();
      toast({
        title: "Foto removida",
        description: "A foto foi removida com sucesso"
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover foto",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Tamanho desconhecido";
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getPhotoLabel = (photo: HomologationPhoto) => {
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

  const handleEditPhotoType = async () => {
    if (!editingPhoto || !editPhotoType) return;

    try {
      await updatePhotoType(editingPhoto.id, editPhotoType);
      await loadPhotos();
      onUpdate?.();
      setEditingPhoto(null);
      setEditPhotoType('');
      toast({
        title: "Tipo atualizado",
        description: "O tipo da foto foi atualizado com sucesso"
      });
    } catch (error) {
      console.error("Error updating photo type:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar tipo da foto",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          <h3 className="font-semibold text-gray-900">Fotos</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          <h3 className="font-semibold text-gray-900">
            Fotos ({photos.length})
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="photo-type-select" className="text-sm font-medium">
              Tipo:
            </Label>
            <Select
              value={selectedPhotoType}
              onValueChange={setSelectedPhotoType}
            >
              <SelectTrigger className="w-40" id="photo-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {photoTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id={`photo-upload-${cardId}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`photo-upload-${cardId}`)?.click()}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Enviando..." : "Adicionar Foto"}
          </Button>
        </div>
      </div>

      {photos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Image className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              Nenhuma foto adicionada ainda
            </p>
            <p className="text-sm text-gray-400 text-center mt-2">
              Clique em "Adicionar Foto" para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="group relative">
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden rounded-lg">
                  <img
                    src={getPhotoUrl(photo.file_path)}
                    alt={photo.file_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2">
                    <Dialog open={editingPhoto?.id === photo.id} onOpenChange={(open) => {
                      if (!open) {
                        setEditingPhoto(null);
                        setEditPhotoType('');
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPhoto(photo);
                            setEditPhotoType(photo.photo_type || 'outros');
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-white"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Tipo da Foto</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit-photo-type">Tipo da Foto</Label>
                            <Select value={editPhotoType} onValueChange={setEditPhotoType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {photoTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingPhoto(null)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleEditPhotoType}>
                              Salvar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePhoto(photo)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getPhotoLabel(photo)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(photo.file_size)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomologationPhotos;
