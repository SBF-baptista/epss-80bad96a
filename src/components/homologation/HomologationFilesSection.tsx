import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Upload, Trash2, Download, FileText, File as FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  uploadHomologationFile,
  fetchHomologationFiles,
  deleteHomologationFile,
  type HomologationFile,
} from "@/services/homologationFileService";

interface HomologationFilesSectionProps {
  cardId: string;
  onUpdate?: () => void;
  readOnly?: boolean;
}

const getFileIcon = (contentType: string | null) => {
  if (!contentType) return <FileIcon className="h-5 w-5 text-muted-foreground" />;
  if (contentType.startsWith('image/')) return <FileIcon className="h-5 w-5 text-blue-500" />;
  if (contentType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return <FileText className="h-5 w-5 text-green-500" />;
  if (contentType.includes('word') || contentType.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />;
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const HomologationFilesSection = ({ cardId, onUpdate, readOnly = false }: HomologationFilesSectionProps) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<(HomologationFile & { url: string })[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadFiles = async () => {
    try {
      const data = await fetchHomologationFiles(cardId);
      setFiles(data);
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [cardId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    // Max 20MB per file
    const oversized = selectedFiles.filter(f => f.size > 20 * 1024 * 1024);
    if (oversized.length > 0) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo por arquivo é 20MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        await uploadHomologationFile(cardId, file);
      }
      toast({ title: "Arquivo(s) enviado(s)", description: `${selectedFiles.length} arquivo(s) enviado(s) com sucesso` });
      await loadFiles();
      onUpdate?.();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({ title: "Erro", description: "Erro ao enviar arquivo(s)", variant: "destructive" });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (file: HomologationFile & { url: string }) => {
    try {
      await deleteHomologationFile(file.id, file.file_path);
      toast({ title: "Arquivo removido", description: `${file.file_name} foi removido` });
      await loadFiles();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({ title: "Erro", description: "Erro ao remover arquivo", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
          Arquivos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id={`file-upload-${cardId}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`file-upload-${cardId}`)?.click()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Enviando..." : "Adicionar Arquivo"}
            </Button>
            <span className="text-xs text-muted-foreground">Qualquer tipo de arquivo (máx. 20MB)</span>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando arquivos...</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo anexado</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-3 p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getFileIcon(file.content_type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)}
                      {' · '}
                      {new Date(file.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.file_name}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HomologationFilesSection;
