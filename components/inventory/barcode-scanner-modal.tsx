'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Barcode,
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (barcode: string) => void;
  title?: string;
  description?: string;
}

const SCANNER_ID = 'autocare-inventory-barcode-scanner';
const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function BarcodeScannerModal({
  open,
  onOpenChange,
  onDetected,
  title = 'Scan Barcode',
  description = 'Use your device camera to scan a barcode.',
}: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false);

  const [starting, setStarting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (error) {
        console.error('[BarcodeScanner] Stop error:', error);
      }

      try {
        scanner.clear();
      } catch {
        // The scanner can already be cleared after an interrupted camera session.
      }
    }

    setScanning(false);
    setStarting(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!open || scannerRef.current) return;

    setScanError(null);
    setStarting(true);
    detectedRef.current = false;

    const container = document.getElementById(SCANNER_ID);

    if (!container) {
      setScanError('Scanner container is not ready. Please try again.');
      setStarting(false);
      return;
    }

    try {
      const scanner = new Html5Qrcode(SCANNER_ID, {
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: { ideal: 'environment' } },
        {
          fps: 10,
          qrbox: undefined,
          aspectRatio: 1.7777778,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
        },
        (decodedText) => {
          const normalized = String(decodedText ?? '').trim();

          if (!normalized || detectedRef.current) return;

          detectedRef.current = true;
          void stopScanner();
          onDetected(normalized);
        },
        () => {
          // Frame decode failures are expected while the barcode is not visible.
        },
      );

      setScanning(true);
    } catch (error: any) {
      console.error('[BarcodeScanner] Start error:', error);
      setScanError(
        error?.message ||
          'Unable to start the camera. Make sure camera permission is allowed.',
      );
      scannerRef.current = null;
    } finally {
      setStarting(false);
    }
  }, [onDetected, open, stopScanner]);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void startScanner();
    }, 350);

    return () => {
      window.clearTimeout(timer);
      void stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void handleClose();
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Barcode className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:p-5">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-black/5">
              <div
                id={SCANNER_ID}
                className="min-h-[260px] w-full overflow-hidden bg-black sm:min-h-[360px]"
              />
            </div>

            {starting ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Starting camera…
              </div>
            ) : null}

            {scanning && !scanError ? (
              <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Camera className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Ready to scan
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Keep the barcode centered in the camera view. AutoCare will stop scanning as soon as a barcode is detected.
                  </p>
                </div>
              </div>
            ) : null}

            {scanError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <X className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Camera unavailable
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {scanError}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void stopScanner();
                    window.setTimeout(() => void startScanner(), 100);
                  }}
                  className={`mt-4 h-11 w-full rounded-md md:h-9 ${focusClass}`}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : null}

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Supported barcode formats
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  AutoCare supports common automotive and retail barcode formats including Code 128, Code 39, EAN, UPC, ITF, and Codabar.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleClose()}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
