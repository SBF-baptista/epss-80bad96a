import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AutomationRulePhoto, getAutomationRulePhotoUrl } from '@/services/automationRulesService'

interface PhotoCardProps {
  photo: AutomationRulePhoto
  isEditing: boolean
  onDelete: (photo: AutomationRulePhoto) => void
  isDeleting?: boolean
}

const PhotoCard = ({ photo, isEditing, onDelete, isDeleting = false }: PhotoCardProps) => {
  return (
    <div className="relative group">
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
          onClick={() => onDelete(photo)}
          disabled={isDeleting}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
      <p className="text-xs text-muted-foreground mt-1 truncate">
        {photo.file_name}
      </p>
    </div>
  )
}

export default PhotoCard