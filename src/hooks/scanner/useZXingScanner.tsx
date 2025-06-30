
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface UseZXingScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  videoPlayingRef: React.RefObject<boolean>;
  mountedRef: React.RefObject<boolean>;
}

export const useZXingScanner = ({
  onScan,
  onError,
  isActive,
  videoRef,
  videoPlayingRef,
  mountedRef,
}: UseZXingScannerProps) => {
  const [reader, setReader] = useState<BrowserMultiFormatReader | null>(null);
  const scanningRef = useRef<boolean>(false);
  const readerControlsRef = useRef<any>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    setReader(codeReader);

    return () => {
      if (codeReader) {
        try {
          codeReader.reset();
        } catch (error) {
          console.warn('Error resetting reader:', error);
        }
      }
    };
  }, []);

  const startZXingScan = useCallback(() => {
    if (!scanningRef.current || !reader || !videoRef.current || !mountedRef.current) {
      console.log('Cannot start ZXing scan - conditions not met');
      return;
    }

    console.log('Starting ZXing continuous scan...');
    
    try {
      const controls = reader.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
        if (result && scanningRef.current && mountedRef.current) {
          const scannedText = result.getText();
          console.log('Barcode detected successfully:', scannedText);
          onScan(scannedText);
        }
        
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
  }, [reader, onScan, onError, videoRef, mountedRef]);

  const startScanning = useCallback(async () => {
    if (!reader || !videoRef.current || scanningRef.current || !mountedRef.current) {
      console.log('Cannot start scanning - conditions not met');
      return;
    }

    scanningRef.current = true;
    
    // Start scanning with the ZXing library's built-in method
    setTimeout(() => {
      if (scanningRef.current && mountedRef.current && videoPlayingRef.current) {
        startZXingScan();
      }
    }, 500);
  }, [reader, videoRef, mountedRef, videoPlayingRef, startZXingScan]);

  const stopScanning = useCallback(() => {
    console.log('Stopping ZXing scanner...');
    scanningRef.current = false;
    
    if (readerControlsRef.current) {
      try {
        readerControlsRef.current.stop();
        readerControlsRef.current = null;
      } catch (error) {
        console.warn('Error stopping ZXing controls:', error);
      }
    }
    
    if (reader) {
      try {
        reader.reset();
      } catch (error) {
        console.warn('Error resetting reader:', error);
      }
    }
  }, [reader]);

  useEffect(() => {
    if (isActive && reader && videoRef.current && videoPlayingRef.current && !scanningRef.current) {
      startScanning();
    } else if (!isActive) {
      stopScanning();
    }

    return () => {
      if (!isActive) {
        stopScanning();
      }
    };
  }, [isActive, reader, startScanning, stopScanning, videoRef, videoPlayingRef]);

  return {
    reader,
    scanningRef,
    startScanning,
    stopScanning,
  };
};
