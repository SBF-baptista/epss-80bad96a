import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PhotoUploadAreaProps {
  ruleId?: number
  isUploading?: boolean
  onFileSelect: (files: File[]) => void
}

const PhotoUploadArea = ({ ruleId, isUploading = false, onFileSelect }: PhotoUploadAreaProps) => {
  const [dragActive, setDragActive] = useState(false)

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
    
    if (!ruleId) return

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0) {
      onFileSelect(imageFiles)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ruleId) return

    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0) {
      onFileSelect(imageFiles)
    }
  }

  if (!ruleId) {
    return (
      <div className="border-2 border-dashed border-amber-200 bg-amber-50 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <p className="text-sm text-amber-700 font-medium">
            As fotos serão adicionadas após salvar a regra
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
        dragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50'
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
        disabled={isUploading}
      >
        {isUploading ? 'Enviando...' : 'Selecionar Fotos'}
      </Button>
    </div>
  )
}

export default PhotoUploadArea