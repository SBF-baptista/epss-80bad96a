import { Image } from 'lucide-react'
import { AutomationRulePhoto } from '@/services/automationRulesService'
import PhotoCard from './PhotoCard'

interface PhotoGridProps {
  photos: AutomationRulePhoto[]
  isEditing: boolean
  onDeletePhoto: (photo: AutomationRulePhoto) => void
  isDeletingPhoto?: boolean
}

const PhotoGrid = ({ photos, isEditing, onDeletePhoto, isDeletingPhoto = false }: PhotoGridProps) => {
  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Image className="mx-auto h-12 w-12 mb-2" />
        <p>Nenhuma foto adicionada</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          isEditing={isEditing}
          onDelete={onDeletePhoto}
          isDeleting={isDeletingPhoto}
        />
      ))}
    </div>
  )
}

export default PhotoGrid