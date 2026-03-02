
import { useEffect, useRef, useCallback } from 'react';
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
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => {
      if (readerRef.current) {
        try { readerRef.current.reset(); } catch (_) {}
      }
    };
  }, []);

  const stopScanning = useCallback(() => {
    scanningRef.current = false;
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch (_) {}
    }
  }, []);

  const startScanning = useCallback(() => {
    const reader = readerRef.current;
    const video = videoRef.current;
    if (!reader || !video || scanningRef.current || !mountedRef.current) {
      console.log('Cannot start ZXing scanning - conditions not met');
      return;
    }

    scanningRef.current = true;
    console.log('Starting ZXing frame-by-frame scanning...');

    // Use interval-based decoding from the existing video element
    const scan = async () => {
      if (!scanningRef.current || !mountedRef.current || !video.videoWidth) return;
      
      try {
        const result = await reader.decodeFromVideoElement(video);
        if (result && scanningRef.current && mountedRef.current) {
          const text = result.getText();
          console.log('Barcode detected:', text);
          onScan(text);
        }
      } catch (e: any) {
        // NotFoundException is expected when no barcode is visible
        if (e?.name !== 'NotFoundException' && 
            e?.name !== 'ChecksumException' && 
            e?.name !== 'FormatException') {
          console.debug('ZXing decode attempt:', e?.name);
        }
      }
    };

    scanIntervalRef.current = setInterval(scan, 500);
  }, [onScan, videoRef, mountedRef]);

  // Auto start/stop based on isActive prop
  useEffect(() => {
    if (isActive && !scanningRef.current) {
      startScanning();
    } else if (!isActive) {
      stopScanning();
    }
    return () => {
      if (!isActive) stopScanning();
    };
  }, [isActive, startScanning, stopScanning]);

  return {
    reader: readerRef.current,
    scanningRef,
    startScanning,
    stopScanning,
  };
};
