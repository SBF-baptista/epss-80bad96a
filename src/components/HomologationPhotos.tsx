
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Upload, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchHomologationPhotos,
  uploadHomologationPhoto,
  deleteHomologationPhoto,
  getPhotoUrl,
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
      await uploadHomologationPhoto(cardId, file);
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

  const getPhotoLabel = (fileName: string) => {
    const lowerFileName = fileName.toLowerCase();
    
    if (lowerFileName.includes('veiculo') || lowerFileName.includes('vehicle')) {
      return 'Foto do Veículo';
    } else if (lowerFileName.includes('chassi') || lowerFileName.includes('chassis')) {
      return 'Foto do Chassi';
    } else if (lowerFileName.includes('can_location') || lowerFileName.includes('conexao_can')) {
      return 'Local de Conexão CAN';
    } else if (lowerFileName.includes('can_wires') || lowerFileName.includes('fios_can')) {
      return 'Fios de Conexão CAN';
    } else if (lowerFileName.includes('instalacao') || lowerFileName.includes('installation')) {
      return 'Foto da Instalação';
    } else {
      return fileName;
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
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
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
                    {getPhotoLabel(photo.file_name)}
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
