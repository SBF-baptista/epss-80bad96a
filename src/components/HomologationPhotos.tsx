
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "lucide-react";
import { fetchHomologationPhotos, HomologationPhoto } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import { PhotoUploadArea, PhotoGrid, PhotoEditModal } from "./homologation-photos";

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

  const handlePhotoUpdate = async () => {
    await loadPhotos();
    onUpdate?.();
  };

  const handlePhotoEdit = (photo: HomologationPhoto) => {
    setEditingPhoto(photo);
  };

  const handleCloseEditModal = () => {
    setEditingPhoto(null);
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
        
        <PhotoUploadArea
          cardId={cardId}
          selectedPhotoType={selectedPhotoType}
          onPhotoTypeChange={setSelectedPhotoType}
          isUploading={isUploading}
          onUploadStart={() => setIsUploading(true)}
          onUploadComplete={() => setIsUploading(false)}
          onUpdate={handlePhotoUpdate}
        />
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
        <PhotoGrid
          photos={photos}
          onPhotoEdit={handlePhotoEdit}
          onUpdate={handlePhotoUpdate}
        />
      )}

      <PhotoEditModal
        photo={editingPhoto}
        isOpen={!!editingPhoto}
        onClose={handleCloseEditModal}
        onUpdate={handlePhotoUpdate}
      />
    </div>
  );
};

export default HomologationPhotos;
