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
}

const AutomationRulePhotos = ({ ruleId, isEditing = false }: AutomationRulePhotosProps) => {
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
    files.forEach(file => {
      uploadMutation.mutate(file)
    })
  }

  const handleDeletePhoto = (photo: AutomationRulePhoto) => {
    deleteMutation.mutate({ photoId: photo.id, filePath: photo.file_path })
  }

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
        photos={photos}
        isEditing={isEditing}
        onDeletePhoto={handleDeletePhoto}
        isDeletingPhoto={deleteMutation.isPending}
      />
    </div>
  )
}

export default AutomationRulePhotos