import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  fetchAutomationRulePhotos,
  uploadAutomationRulePhoto,
  deleteAutomationRulePhoto,
  AutomationRulePhoto
} from '@/services/automationRulesService'
import { PhotoUploadArea, PhotoGrid } from './automation-photos'

interface AutomationRulePhotosProps {
  ruleId?: number
  isEditing?: boolean
  temporaryPhotos?: File[]
  onTemporaryPhotosChange?: (photos: File[]) => void
}

const AutomationRulePhotos = ({ 
  ruleId, 
  isEditing = false, 
  temporaryPhotos = [], 
  onTemporaryPhotosChange 
}: AutomationRulePhotosProps) => {
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

  const handleFileSelect = (files: File[]) => {
    if (ruleId) {
      // If we have a rule ID, upload directly
      files.forEach(file => {
        uploadMutation.mutate(file)
      })
    } else if (onTemporaryPhotosChange) {
      // If no rule ID, add to temporary photos
      onTemporaryPhotosChange([...temporaryPhotos, ...files])
      toast({
        title: "Fotos adicionadas",
        description: `${files.length} foto(s) serão enviadas após salvar a regra.`,
      })
    }
  }

  const handleDeletePhoto = (photo: AutomationRulePhoto) => {
    deleteMutation.mutate({ photoId: photo.id, filePath: photo.file_path })
  }

  const handleDeleteTemporaryPhoto = (index: number) => {
    if (onTemporaryPhotosChange) {
      const newPhotos = temporaryPhotos.filter((_, i) => i !== index)
      onTemporaryPhotosChange(newPhotos)
    }
  }

  // Convert temporary photos to display format
  const temporaryPhotoItems = temporaryPhotos.map((file, index) => ({
    id: `temp-${index}`,
    file_name: file.name,
    file_path: URL.createObjectURL(file),
    created_at: new Date().toISOString(),
    automation_rule_id: 0,
    file_size: file.size,
    content_type: file.type
  }))

  // Combine server photos with temporary photos for display
  const allPhotos = [...photos, ...temporaryPhotoItems]

  return (
    <div className="space-y-4">
      <Label>Fotos da Regra</Label>
      
      {isEditing && (
        <PhotoUploadArea
          ruleId={ruleId}
          isUploading={uploadMutation.isPending}
          onFileSelect={handleFileSelect}
        />
      )}

      <PhotoGrid
        photos={allPhotos}
        isEditing={isEditing}
        onDeletePhoto={(photo) => {
          if (photo.id.startsWith('temp-')) {
            const index = parseInt(photo.id.replace('temp-', ''))
            handleDeleteTemporaryPhoto(index)
          } else {
            handleDeletePhoto(photo as AutomationRulePhoto)
          }
        }}
        isDeletingPhoto={deleteMutation.isPending}
      />
    </div>
  )
}

export default AutomationRulePhotos