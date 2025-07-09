import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadHomologationPhoto } from "@/services/homologationService";
import PhotoTypeSelector from "./PhotoTypeSelector";

interface PhotoUploadAreaProps {
  cardId: string;
  selectedPhotoType: string;
  onPhotoTypeChange: (type: string) => void;
  isUploading: boolean;
  onUploadStart: () => void;
  onUploadComplete: () => void;
  onUpdate?: () => void;
}

const PhotoUploadArea = ({
  cardId,
  selectedPhotoType,
  onPhotoTypeChange,
  isUploading,
  onUploadStart,
  onUploadComplete,
  onUpdate
}: PhotoUploadAreaProps) => {
  const { toast } = useToast();

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

    onUploadStart();
    try {
      // Create descriptive filename
      const originalName = file.name;
      const extension = originalName.substring(originalName.lastIndexOf('.'));
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const newFileName = `foto_homologacao_${timestamp}${extension}`;
      
      // Create a new file with the descriptive name
      const renamedFile = new File([file], newFileName, { type: file.type });
      
      await uploadHomologationPhoto(cardId, renamedFile, selectedPhotoType);
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
      onUploadComplete();
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <PhotoTypeSelector
        value={selectedPhotoType}
        onValueChange={onPhotoTypeChange}
        disabled={isUploading}
      />
      
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
  );
};

export default PhotoUploadArea;