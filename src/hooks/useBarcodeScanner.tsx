
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
  const readerControlsRef = useRef<any>(null);

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
        
        const video = videoRef.current;
        
        const handleCanPlay = async () => {
          if (!mountedRef.current || !scanningRef.current || videoPlayingRef.current) return;
          
          console.log('Video can play - attempting to start playback...');
          try {
            await video.play();
            videoPlayingRef.current = true;
            console.log('Video is now playing, starting scan loop...');
            
            // Start scanning with the ZXing library's built-in method
            setTimeout(() => {
              if (scanningRef.current && mountedRef.current) {
                startZXingScan();
              }
            }, 500);
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
        
        // Store cleanup function
        (video as any)._cleanup = () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
        };
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

  const startZXingScan = useCallback(() => {
    if (!scanningRef.current || !reader || !videoRef.current || !mountedRef.current) {
      console.log('Cannot start ZXing scan - conditions not met');
      return;
    }

    console.log('Starting ZXing continuous scan...');
    
    try {
      // Use ZXing's built-in continuous decode method
      const controls = reader.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
        if (result && scanningRef.current && mountedRef.current) {
          const scannedText = result.getText();
          console.log('Barcode detected successfully:', scannedText);
          onScan(scannedText);
        }
        
        // Only log significant errors
        if (error && error.name && 
            error.name !== 'NotFoundException' && 
            error.name !== 'ChecksumException' && 
            error.name !== 'FormatException' &&
            error.name !== 'ReaderException') {
          console.warn('Scanning error:', error.name, error.message);
          
          if (error.name === 'NotSupportedError' || error.name === 'InvalidStateError') {
            if (mountedRef.current) {
              onError?.(`Erro do scanner: ${error.message}`);
            }
          }
        }
      });
      
      readerControlsRef.current = controls;
      
    } catch (error) {
      console.error('Error starting ZXing scan:', error);
      if (mountedRef.current) {
        onError?.('Erro ao iniciar o scanner.');
      }
    }
  }, [reader, onScan, onError]);

  const stopScanning = useCallback(() => {
    console.log('Stopping scanner...');
    scanningRef.current = false;
    
    // Stop ZXing continuous scanning
    if (readerControlsRef.current) {
      try {
        readerControlsRef.current.stop();
        readerControlsRef.current = null;
      } catch (error) {
        console.warn('Error stopping ZXing controls:', error);
      }
    }
    
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
