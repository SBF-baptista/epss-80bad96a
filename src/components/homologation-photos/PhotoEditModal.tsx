import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HomologationPhoto, updatePhotoType } from "@/services/homologationService";
import { useToast } from "@/hooks/use-toast";
import { photoTypes } from "./photoTypes";

interface PhotoEditModalProps {
  photo: HomologationPhoto | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const PhotoEditModal = ({ photo, isOpen, onClose, onUpdate }: PhotoEditModalProps) => {
  const { toast } = useToast();
  const [editPhotoType, setEditPhotoType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when photo changes
  useState(() => {
    if (photo) {
      setEditPhotoType(photo.photo_type || 'outros');
    }
  });

  const handleEditPhotoType = async () => {
    if (!photo || !editPhotoType) return;

    setIsLoading(true);
    try {
      await updatePhotoType(photo.id, editPhotoType);
      onUpdate();
      onClose();
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEditPhotoType('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleEditPhotoType} disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoEditModal;