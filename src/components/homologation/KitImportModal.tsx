import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react';
import { parseKitsTxtFile, convertToCreateRequest, type ParsedKit } from '@/services/kitImportService';
import { createHomologationKit, fetchHomologationKits } from '@/services/homologationKitService';
import { toast } from '@/hooks/use-toast';
import { HomologationKit } from '@/types/homologationKit';

interface KitImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKitsImported: () => void;
  homologationCardId?: string;
}

interface DuplicateKit {
  parsedKit: ParsedKit;
  existingKit: HomologationKit;
}

const KitImportModal: React.FC<KitImportModalProps> = ({
  open,
  onOpenChange,
  onKitsImported,
  homologationCardId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<ReturnType<typeof parseKitsTxtFile> | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateKit[]>([]);
  const [replaceDecisions, setReplaceDecisions] = useState<Map<string, boolean>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.txt')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo .txt",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    
    // Read and parse the file
    try {
      const content = await selectedFile.text();
      const result = parseKitsTxtFile(content);
      setValidationResult(result);

      // Check for duplicates
      if (result.isValid && result.kits.length > 0) {
        await checkDuplicates(result.kits);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível processar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const checkDuplicates = async (kits: ParsedKit[]) => {
    try {
      const existingKits = await fetchHomologationKits(homologationCardId);
      const duplicatesFound: DuplicateKit[] = [];

      kits.forEach(parsedKit => {
        const existing = existingKits.find(
          ek => ek.name.toLowerCase().trim() === parsedKit.name.toLowerCase().trim()
        );
        if (existing) {
          duplicatesFound.push({ parsedKit, existingKit: existing });
        }
      });

      setDuplicates(duplicatesFound);
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  };

  const handleReplaceDecision = (kitName: string, replace: boolean) => {
    setReplaceDecisions(prev => new Map(prev).set(kitName, replace));
  };

  const handleImport = async () => {
    if (!validationResult || !validationResult.isValid) return;

    setIsProcessing(true);

    try {
      let successCount = 0;
      let skipCount = 0;
      const errors: string[] = [];

      for (const parsedKit of validationResult.kits) {
        const isDuplicate = duplicates.some(d => d.parsedKit.name === parsedKit.name);
        
        if (isDuplicate) {
          const shouldReplace = replaceDecisions.get(parsedKit.name);
          
          if (shouldReplace === undefined) {
            // User hasn't decided yet
            errors.push(`Kit "${parsedKit.name}": Decisão de substituição pendente.`);
            continue;
          }
          
          if (!shouldReplace) {
            // Skip this kit
            skipCount++;
            continue;
          }

          // Delete existing kit and create new one
          const existingKit = duplicates.find(d => d.parsedKit.name === parsedKit.name)?.existingKit;
          if (existingKit?.id) {
            const { error: deleteError } = await (await import('@/integrations/supabase/client')).supabase
              .from('homologation_kits')
              .delete()
              .eq('id', existingKit.id);

            if (deleteError) {
              errors.push(`Erro ao substituir kit "${parsedKit.name}": ${deleteError.message}`);
              continue;
            }
          }
        }

        // Create the kit
        try {
          const createRequest = convertToCreateRequest(parsedKit, homologationCardId);
          await createHomologationKit(createRequest);
          successCount++;
        } catch (error: any) {
          errors.push(`Erro ao criar kit "${parsedKit.name}": ${error.message || 'Erro desconhecido'}`);
        }
      }

      // Show result
      if (successCount > 0) {
        toast({
          title: "Importação concluída",
          description: `${successCount} kit(s) importado(s) com sucesso${skipCount > 0 ? `, ${skipCount} ignorado(s)` : ''}.`,
        });
        onKitsImported();
        handleClose();
      } else if (errors.length > 0) {
        toast({
          title: "Falha na importação",
          description: errors.join('\n'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error importing kits:', error);
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar os kits.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setValidationResult(null);
    setDuplicates([]);
    setReplaceDecisions(new Map());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const canImport = validationResult?.isValid && 
    (duplicates.length === 0 || duplicates.every(d => replaceDecisions.has(d.parsedKit.name)));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Kits de Arquivo TXT
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo .txt com a estrutura definida para importar kits automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileSelect}
              className="hidden"
              id="kit-file-upload"
            />
            <label
              htmlFor="kit-file-upload"
              className="flex flex-col items-center gap-2 cursor-pointer"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-sm">
                {file ? (
                  <span className="font-medium text-foreground">{file.name}</span>
                ) : (
                  <>
                    <span className="font-medium text-primary">Clique para selecionar</span>
                    <span className="text-muted-foreground"> ou arraste um arquivo .txt</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-4">
                {/* Errors */}
                {validationResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Erros encontrados:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {validationResult.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Avisos:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {validationResult.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Duplicates */}
                {duplicates.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-3">⚠️ Kits já cadastrados encontrados:</div>
                      <div className="space-y-3">
                        {duplicates.map((dup, i) => (
                          <div key={i} className="border rounded p-3 space-y-2">
                            <div className="font-medium">{dup.parsedKit.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Deseja substituir os dados existentes?
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={replaceDecisions.get(dup.parsedKit.name) === true ? "default" : "outline"}
                                onClick={() => handleReplaceDecision(dup.parsedKit.name, true)}
                              >
                                Sim, substituir
                              </Button>
                              <Button
                                size="sm"
                                variant={replaceDecisions.get(dup.parsedKit.name) === false ? "default" : "outline"}
                                onClick={() => handleReplaceDecision(dup.parsedKit.name, false)}
                              >
                                Não, manter existente
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success Summary */}
                {validationResult.isValid && validationResult.kits.length > 0 && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <div className="font-semibold text-green-800 mb-2">
                        {validationResult.kits.length} kit(s) pronto(s) para importação:
                      </div>
                      <div className="space-y-2">
                        {validationResult.kits.map((kit, i) => (
                          <div key={i} className="text-sm">
                            <div className="font-medium text-green-900">{kit.name}</div>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary">{kit.equipment.length} equipamento(s)</Badge>
                              <Badge variant="secondary">{kit.accessories.length} acessório(s)</Badge>
                              <Badge variant="secondary">{kit.supplies.length} insumo(s)</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport || isProcessing}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Importar {validationResult?.kits.length || 0} Kit(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KitImportModal;
