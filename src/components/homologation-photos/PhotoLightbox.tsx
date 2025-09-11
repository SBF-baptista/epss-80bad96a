import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";
import { HomologationPhoto, getPhotoUrl } from "@/services/homologationService";
import { getPhotoLabel } from "./photoUtils";

interface PhotoLightboxProps {
  photos: HomologationPhoto[];
  currentPhotoIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

const PhotoLightbox = ({ photos, currentPhotoIndex, isOpen, onClose }: PhotoLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(currentPhotoIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialZoom, setInitialZoom] = useState(1);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    setCurrentIndex(currentPhotoIndex);
    setZoom(1);
    setRotation(0);
    setDragPosition({ x: 0, y: 0 });
  }, [currentPhotoIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '=':
        case '+':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotate();
          break;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isOpen) return;
      e.preventDefault();
      
      const delta = e.deltaY > 0 ? -1 : 1;
      const zoomFactor = 1.1;
      
      if (delta > 0) {
        setZoom(prev => Math.min(prev * zoomFactor, 5));
      } else {
        setZoom(prev => Math.max(prev / zoomFactor, 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, currentIndex]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetTransforms();
    }
  };

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetTransforms();
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetTransforms = () => {
    setZoom(1);
    setRotation(0);
    setDragPosition({ x: 0, y: 0 });
  };

  const handleDownload = async () => {
    if (!currentPhoto) return;
    
    try {
      const url = getPhotoUrl(currentPhoto.file_path);
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = currentPhoto.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading photo:', error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX - dragPosition.x, 
      y: e.clientY - dragPosition.y 
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setDragPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom > 1) {
      // Single touch for dragging
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - dragPosition.x, 
        y: e.touches[0].clientY - dragPosition.y 
      });
    } else if (e.touches.length === 2) {
      // Two finger pinch for zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && zoom > 1) {
      // Single touch dragging
      e.preventDefault();
      setDragPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2) {
      // Two finger pinch zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      if (initialPinchDistance > 0) {
        const scale = distance / initialPinchDistance;
        const newZoom = Math.min(Math.max(initialZoom * scale, 0.5), 5);
        setZoom(newZoom);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setInitialPinchDistance(0);
    }
  };

  if (!currentPhoto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full h-screen w-screen p-0 bg-background/95 backdrop-blur-sm">
        <div className="relative h-full w-full flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground line-clamp-1">
                  {getPhotoLabel(currentPhoto)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentIndex + 1} de {photos.length}
                </p>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 5}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRotate}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main Image Area */}
          <div 
            className="flex-1 flex items-center justify-center relative overflow-hidden pt-20 pb-16"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={getPhotoUrl(currentPhoto.file_path)}
              alt={currentPhoto.file_name}
              className={`max-w-full max-h-full object-contain transition-transform duration-200 select-none ${
                zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'
              } ${isDragging ? 'cursor-grabbing' : ''}`}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${dragPosition.x}px, ${dragPosition.y}px)`,
              }}
              onMouseDown={handleMouseDown}
              onClick={(e) => {
                if (zoom <= 1) {
                  e.preventDefault();
                  handleZoomIn();
                }
              }}
              draggable={false}
            />
          </div>

          {/* Navigation */}
          <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t border-border p-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <Button
                variant="ghost"
                onClick={resetTransforms}
                className="text-sm"
              >
                Resetar
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleNext}
                disabled={currentIndex === photos.length - 1}
                className="flex items-center gap-2"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-muted/80 rounded px-2 py-1">
            ESC: Fechar | ←→: Navegar | Scroll/Pinça: Zoom | R: Girar | Arraste: Mover
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoLightbox;