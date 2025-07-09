import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Edit3 } from "lucide-react";
import { HomologationPhoto, deleteHomologationPhoto, getPhotoUrl } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize, getPhotoLabel } from "./photoUtils";

interface PhotoGridProps {
  photos: HomologationPhoto[];
  onPhotoEdit: (photo: HomologationPhoto) => void;
  onUpdate?: () => void;
}

const PhotoGrid = ({ photos, onPhotoEdit, onUpdate }: PhotoGridProps) => {
  const { toast } = useToast();

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

  return (
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPhotoEdit(photo)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-white"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                
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
  );
};

export default PhotoGrid;