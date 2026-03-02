
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
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanningRef = useRef<boolean>(false);
  const readerControlsRef = useRef<any>(null);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();

    return () => {
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (error) {
          console.warn('Error resetting reader:', error);
        }
      }
    };
  }, []);

  const startZXingScan = useCallback(async () => {
    const reader = readerRef.current;
    if (!scanningRef.current || !reader || !videoRef.current || !mountedRef.current) {
      console.log('Cannot start ZXing scan - conditions not met');
      return;
    }

    console.log('Starting ZXing continuous scan...');
    
    try {
      const controls = await reader.decodeFromVideoDevice(
        undefined, 
        videoRef.current, 
        (result, error) => {
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
        }
      );
      
      readerControlsRef.current = controls;
      console.log('ZXing scanner started successfully');
      
    } catch (error) {
      console.error('Error starting ZXing scan:', error);
      if (mountedRef.current) {
        onError?.('Erro ao iniciar o scanner.');
      }
    }
  }, [onScan, onError, videoRef, mountedRef]);

  const startScanning = useCallback(async () => {
    const reader = readerRef.current;
    if (!reader || !videoRef.current || scanningRef.current || !mountedRef.current) {
      console.log('Cannot start scanning - conditions not met');
      return;
    }

    scanningRef.current = true;
    
    // Start scanning directly - ZXing will manage the camera stream
    await startZXingScan();
  }, [videoRef, mountedRef, startZXingScan]);

  const stopScanning = useCallback(() => {
    console.log('Stopping ZXing scanner...');
    scanningRef.current = false;
    
    if (readerControlsRef.current) {
      try {
        if (typeof readerControlsRef.current.stop === 'function') {
          readerControlsRef.current.stop();
        }
        readerControlsRef.current = null;
      } catch (error) {
        console.warn('Error stopping ZXing controls:', error);
      }
    }
    
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (error) {
        console.warn('Error resetting reader:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive && readerRef.current && !scanningRef.current) {
      startScanning();
    } else if (!isActive) {
      stopScanning();
    }

    return () => {
      if (!isActive) {
        stopScanning();
      }
    };
  }, [isActive, startScanning, stopScanning]);

  return {
    reader: readerRef.current,
    scanningRef,
    startScanning,
    stopScanning,
  };
};
