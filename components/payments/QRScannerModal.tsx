'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { Html5Qrcode } from 'html5-qrcode';
import {
  Keyboard,
  Loader2,
  QrCode,
  ScanLine,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (billId: string) => void;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function QRScannerModal({
  open,
  onOpenChange,
  onScan,
}: QRScannerModalProps) {
  const [manualId, setManualId] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }

      scannerRef.current = null;
    }

    setScanning(false);
    setStarting(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScanError(null);
    setStarting(true);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
          },
        });

      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      console.error('Camera permission denied:', err);

      setScanError(
        'Camera access denied. Please allow camera permissions in your browser settings.'
      );

      setStarting(false);
      return;
    }

    const container =
      document.getElementById(scannerContainerId);

    if (!container) {
      setScanError('Scanner container not found.');
      setStarting(false);
      return;
    }

    try {
      const scanner = new Html5Qrcode(
        scannerContainerId
      );

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          stopScanner().catch(console.error);
          onScan(decodedText);
          onOpenChange(false);
        },
        () => {}
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Scanner start error:', err);

      setScanError(
        'Failed to start camera. Please refresh the page and try again.'
      );
    } finally {
      setStarting(false);
    }
  }, [onScan, onOpenChange, stopScanner]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        startScanner();
      }, 400);
    } else {
      stopScanner();
      setScanError(null);
      setStarting(false);
    }

    return () => {
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const handleManualSubmit = () => {
    const trimmed = manualId.trim();

    if (!trimmed) {
      toast.error('Please enter a valid Bill ID.');
      return;
    }

    onScan(trimmed);
    setManualId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[calc(100%-1rem)] overflow-hidden rounded-xl
          border border-border bg-card p-0 shadow-2xl
          sm:max-w-md
        "
      >
        <div className="border-b border-border bg-background/80 p-4 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <QrCode className="h-5 w-5 text-primary" />
              Scan QR Code
            </DialogTitle>

            <DialogDescription>
              Scan the customer's QR code or enter the Bill ID manually.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-5">
          <Tabs defaultValue="scan" className="w-full">
            <TabsList className="grid h-11 w-full grid-cols-2 rounded-md bg-muted/60 p-1 md:h-9">
              <TabsTrigger
                value="scan"
                className={`rounded-sm text-sm ${focusClass}`}
              >
                <ScanLine className="mr-2 h-4 w-4" />
                Scan QR
              </TabsTrigger>

              <TabsTrigger
                value="manual"
                className={`rounded-sm text-sm ${focusClass}`}
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="scan"
              className="mt-4"
            >
              {starting && (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border bg-muted/20">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Accessing camera...
                  </p>
                </div>
              )}

              {scanError && !starting && (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/[0.03] px-6 text-center">
                  <X className="mb-3 h-8 w-8 text-destructive" />
                  <p className="text-sm text-muted-foreground">
                    {scanError}
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className={`mt-4 h-11 rounded-md md:h-9 ${focusClass}`}
                    onClick={() => {
                      stopScanner();
                      startScanner();
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              )}

              <div
                id={scannerContainerId}
                className="w-full overflow-hidden rounded-lg"
                style={{
                  minHeight: scanning ? 300 : 0,
                }}
              />
            </TabsContent>

            <TabsContent
              value="manual"
              className="mt-4"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Bill ID
                  </Label>

                  <Input
                    value={manualId}
                    onChange={(e) =>
                      setManualId(e.target.value)
                    }
                    placeholder="Paste or type the Bill ID"
                    className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleManualSubmit}
                  className={`h-11 w-full rounded-md md:h-9 ${focusClass}`}
                >
                  Look Up Bill
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t border-border p-4">
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
            >
              Cancel
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}