import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Edit3, Eye } from "lucide-react";
import { HomologationPhoto, deleteHomologationPhoto, getPhotoUrl } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize, getPhotoLabel } from "./photoUtils";
import PhotoLightbox from "./PhotoLightbox";

interface PhotoGridProps {
  photos: HomologationPhoto[];
  onPhotoEdit: (photo: HomologationPhoto) => void;
  onUpdate?: () => void;
}

const PhotoGrid = ({ photos, onPhotoEdit, onUpdate }: PhotoGridProps) => {
  const { toast } = useToast();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const handleDeletePhoto = async (photo: HomologationPhoto) => {
    try {
      await deleteHomologationPhoto(photo.id, photo.file_path);
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

  const handlePhotoView = (photoIndex: number) => {
    setCurrentPhotoIndex(photoIndex);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <Card key={photo.id} className="group relative">
            <CardContent className="p-0">
              <div className="aspect-square relative overflow-hidden rounded-lg">
                <img
                  src={getPhotoUrl(photo.file_path)}
                  alt={photo.file_name}
                  className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
                  onClick={() => handlePhotoView(index)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePhotoView(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/90 hover:bg-background border-border"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPhotoEdit(photo);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/90 hover:bg-background border-border"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-foreground truncate">
                  {getPhotoLabel(photo)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(photo.file_size)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PhotoLightbox
        photos={photos}
        currentPhotoIndex={currentPhotoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

export default PhotoGrid;