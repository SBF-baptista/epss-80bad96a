
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface UseBarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

export const useBarcodeScanner = ({ onScan, onError, isActive }: UseBarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reader, setReader] = useState<BrowserMultiFormatReader | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPlayingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    const codeReader = new BrowserMultiFormatReader();
    setReader(codeReader);

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isActive && reader && videoRef.current && !scanningRef.current) {
      startScanning();
    } else if (!isActive) {
      stopScanning();
    }

    return () => {
      if (!isActive) {
        stopScanning();
      }
    };
  }, [isActive, reader]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up scanner resources...');
    stopScanning();
    if (reader) {
      try {
        reader.reset();
      } catch (error) {
        console.warn('Error resetting reader:', error);
      }
    }
    stopVideoStream();
  }, [reader]);

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

  const startScanning = async () => {
    if (!reader || !videoRef.current || scanningRef.current || !mountedRef.current) {
      console.log('Cannot start scanning - conditions not met');
      return;
    }

    try {
      console.log('Starting scanner - requesting camera access...');
      setIsScanning(true);
      scanningRef.current = true;
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (!mountedRef.current || !scanningRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }
      
      setStream(mediaStream);
      setHasPermission(true);
      
      console.log('Camera access granted, setting up video...');
      
      if (videoRef.current && !videoPlayingRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Set up video event listeners
        const video = videoRef.current;
        
        const handleLoadedMetadata = async () => {
          if (!mountedRef.current || !scanningRef.current || videoPlayingRef.current) return;
          
          console.log('Video metadata loaded, attempting to play...');
          try {
            if (video && video.readyState >= 2) {
              await video.play();
              videoPlayingRef.current = true;
              console.log('Video is now playing, starting scan loop...');
              
              // Start scanning after a short delay to ensure video is stable
              setTimeout(() => {
                if (scanningRef.current && mountedRef.current) {
                  startScanLoop();
                }
              }, 500);
            }
          } catch (playError) {
            console.error('Error playing video:', playError);
            if (mountedRef.current) {
              onError?.('Erro ao reproduzir o vídeo da câmera.');
            }
          }
        };

        const handleCanPlay = () => {
          console.log('Video can play - ready state:', video.readyState);
        };

        const handleError = (error: Event) => {
          console.error('Video error:', error);
          if (mountedRef.current) {
            onError?.('Erro no vídeo da câmera.');
          }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        video.addEventListener('canplay', handleCanPlay, { once: true });
        video.addEventListener('error', handleError);
        
        // Cleanup listeners when component unmounts
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
        };
        
        // Store cleanup function
        (video as any)._cleanup = cleanup;
      }
      
    } catch (error) {
      console.error('Camera access error:', error);
      if (!mountedRef.current) return;
      
      setHasPermission(false);
      setIsScanning(false);
      scanningRef.current = false;
      
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
    }
  };

  const startScanLoop = useCallback(() => {
    if (!scanningRef.current || !reader || !videoRef.current || !mountedRef.current) {
      console.log('Cannot start scan loop - conditions not met');
      return;
    }

    console.log('Starting optimized scan loop...');
    
    const performScan = async () => {
      if (!scanningRef.current || !videoRef.current || !mountedRef.current) return;

      const video = videoRef.current;
      
      // Check if video is ready and playing
      if (video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      try {
        // Use decodeOnceFromVideoDevice with proper error handling
        const result = await reader.decodeOnceFromVideoDevice(undefined, video);
        
        if (result && scanningRef.current && mountedRef.current) {
          const scannedText = result.getText();
          console.log('Barcode detected successfully:', scannedText);
          
          // Brief pause after successful scan
          setTimeout(() => {
            if (mountedRef.current) {
              onScan(scannedText);
            }
          }, 100);
        }
      } catch (error: any) {
        // Only log significant errors, ignore common scanning exceptions
        if (error.name && 
            error.name !== 'NotFoundException' && 
            error.name !== 'ChecksumException' && 
            error.name !== 'FormatException' &&
            error.name !== 'ReaderException') {
          console.warn('Scanning error:', error.name, error.message);
          
          // Only report critical errors to user
          if (error.name === 'NotSupportedError' || error.name === 'InvalidStateError') {
            if (mountedRef.current) {
              onError?.(`Erro do scanner: ${error.message}`);
            }
          }
        }
      }
    };

    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    // Start the scanning loop with a reasonable interval
    scanIntervalRef.current = setInterval(performScan, 250);
    
    // Perform immediate scan
    setTimeout(performScan, 100);
  }, [reader, onScan, onError]);

  const stopScanning = useCallback(() => {
    console.log('Stopping scanner...');
    scanningRef.current = false;
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Clean up video event listeners
    if (videoRef.current && (videoRef.current as any)._cleanup) {
      (videoRef.current as any)._cleanup();
      delete (videoRef.current as any)._cleanup;
    }
    
    if (reader) {
      try {
        reader.reset();
      } catch (error) {
        console.warn('Error resetting reader:', error);
      }
    }
    
    stopVideoStream();
    setIsScanning(false);
  }, [reader, stopVideoStream]);

  const handleRetryPermission = useCallback(() => {
    console.log('Retrying camera permission...');
    setHasPermission(null);
    if (isActive && mountedRef.current) {
      setTimeout(startScanning, 100);
    }
  }, [isActive]);

  return {
    videoRef,
    hasPermission,
    isScanning,
    handleRetryPermission,
  };
};
