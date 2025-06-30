
import { useRef, useState, useCallback, useEffect } from 'react';

interface UseVideoStreamProps {
  isActive: boolean;
  onError?: (error: string) => void;
}

export const useVideoStream = ({ isActive, onError }: UseVideoStreamProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoPlayingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopVideoStream = useCallback(() => {
    if (stream) {
      console.log('Stopping video stream...');
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Error stopping track:', error);
        }
      });
      setStream(null);
    }
    videoPlayingRef.current = false;
  }, [stream]);

  const startVideoStream = useCallback(async () => {
    if (!videoRef.current || !mountedRef.current) {
      console.log('Cannot start video stream - conditions not met');
      return false;
    }

    try {
      console.log('Starting video stream - requesting camera access...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (!mountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return false;
      }
      
      setStream(mediaStream);
      setHasPermission(true);
      
      console.log('Camera access granted, setting up video...');
      
      if (videoRef.current && !videoPlayingRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        const video = videoRef.current;
        
        const handleCanPlay = async () => {
          if (!mountedRef.current || videoPlayingRef.current) return;
          
          console.log('Video can play - attempting to start playback...');
          try {
            await video.play();
            videoPlayingRef.current = true;
            console.log('Video is now playing');
          } catch (playError) {
            console.error('Error playing video:', playError);
            if (mountedRef.current) {
              onError?.('Erro ao reproduzir o vídeo da câmera.');
            }
          }
        };

        const handleError = (error: Event) => {
          console.error('Video error:', error);
          if (mountedRef.current) {
            onError?.('Erro no vídeo da câmera.');
          }
        };

        video.addEventListener('canplay', handleCanPlay, { once: true });
        video.addEventListener('error', handleError);
        
        (video as any)._cleanup = () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
        };
      }
      
      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      if (!mountedRef.current) return false;
      
      setHasPermission(false);
      
      let errorMessage = 'Erro ao acessar câmera. Verifique as permissões.';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Acesso à câmera negado. Permita o acesso nas configurações do navegador.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Câmera está sendo usada por outro aplicativo.';
        }
      }
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up video stream resources...');
    if (videoRef.current && (videoRef.current as any)._cleanup) {
      (videoRef.current as any)._cleanup();
      delete (videoRef.current as any)._cleanup;
    }
    stopVideoStream();
  }, [stopVideoStream]);

  const handleRetryPermission = useCallback(() => {
    console.log('Retrying camera permission...');
    setHasPermission(null);
    if (isActive && mountedRef.current) {
      setTimeout(startVideoStream, 100);
    }
  }, [isActive, startVideoStream]);

  return {
    videoRef,
    stream,
    hasPermission,
    videoPlayingRef,
    mountedRef,
    startVideoStream,
    stopVideoStream,
    cleanup,
    handleRetryPermission,
  };
};
