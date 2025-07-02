import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, X, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  fetchAutomationRulePhotos,
  uploadAutomationRulePhoto,
  deleteAutomationRulePhoto,
  getAutomationRulePhotoUrl,
  AutomationRulePhoto
} from '@/services/automationRulesService'

interface AutomationRulePhotosProps {
  ruleId?: number
  isEditing?: boolean
}

const AutomationRulePhotos = ({ ruleId, isEditing = false }: AutomationRulePhotosProps) => {
  console.log('AutomationRulePhotos render:', { ruleId, isEditing })
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch photos only if we have a rule ID (editing mode)
  const { data: photos = [] } = useQuery({
    queryKey: ['automation-rule-photos', ruleId],
    queryFn: () => ruleId ? fetchAutomationRulePhotos(ruleId) : Promise.resolve([]),
    enabled: !!ruleId
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      if (!ruleId) throw new Error('Rule ID is required for upload')
      return uploadAutomationRulePhoto(ruleId, file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rule-photos', ruleId] })
      toast({
        title: "Foto enviada",
        description: "A foto foi enviada com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Error uploading photo:', error)
      toast({
        title: "Erro ao enviar foto",
        description: "Ocorreu um erro ao enviar a foto. Tente novamente.",
        variant: "destructive",
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ({ photoId, filePath }: { photoId: string; filePath: string }) =>
      deleteAutomationRulePhoto(photoId, filePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rule-photos', ruleId] })
      toast({
        title: "Foto excluída",
        description: "A foto foi excluída com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Error deleting photo:', error)
      toast({
        title: "Erro ao excluir foto",
        description: "Ocorreu um erro ao excluir a foto. Tente novamente.",
        variant: "destructive",
      })
    },
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (!isEditing || !ruleId) return

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    imageFiles.forEach(file => {
      uploadMutation.mutate(file)
    })
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing || !ruleId) return

    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    imageFiles.forEach(file => {
      uploadMutation.mutate(file)
    })
  }

  const handleDelete = (photo: AutomationRulePhoto) => {
    deleteMutation.mutate({ photoId: photo.id, filePath: photo.file_path })
  }

  return (
    <div className="space-y-4">
      <Label>Fotos da Regra</Label>
      
      {/* Upload area - show message during creation */}
      {isEditing && (
        <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          ruleId ? 'border-border hover:border-primary/50' : 'border-amber-200 bg-amber-50'
        }`}>
          {ruleId ? (
            <>
              <div
                className={`transition-colors ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : ''
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arraste fotos aqui ou clique para selecionar
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                  id="photo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Enviando...' : 'Selecionar Fotos'}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <p className="text-sm text-amber-700 font-medium">
                As fotos serão adicionadas após salvar a regra
              </p>
            </div>
          )}
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={getAutomationRulePhotoUrl(photo.file_path)}
                  alt={photo.file_name}
                  className="w-full h-full object-cover"
                />
              </div>
              {isEditing && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(photo)}
                  disabled={deleteMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {photo.file_name}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Image className="mx-auto h-12 w-12 mb-2" />
          <p>Nenhuma foto adicionada</p>
        </div>
      )}
    </div>
  )
}

export default AutomationRulePhotos