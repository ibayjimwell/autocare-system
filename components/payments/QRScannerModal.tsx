'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Keyboard, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (billId: string) => void;
}

export default function QRScannerModal({ open, onOpenChange, onScan }: QRScannerModalProps) {
  const [manualId, setManualId] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);        // camera active?
  const [starting, setStarting] = useState(false);        // permission + init phase
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  // ---------- cleanup ----------
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

  // ---------- start with permission check ----------
  const startScanner = useCallback(async () => {
    setScanError(null);
    setStarting(true);

    // 1. Trigger native camera permission prompt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      // Stop the stream immediately – we only needed the permission
      stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      console.error('Camera permission denied:', err);
      setScanError('Camera access denied. Please allow camera permissions in your browser settings.');
      setStarting(false);
      return;
    }

    // 2. Check that the container exists (after Modal animation)
    const container = document.getElementById(scannerContainerId);
    if (!container) {
      setScanError('Scanner container not found.');
      setStarting(false);
      return;
    }

    // 3. Create and start the scanner
    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          // QR detected
          stopScanner().catch(console.error);
          onScan(decodedText);
          onOpenChange(false);
        },
        () => {
          // scan failure – ignore (the library already shows a "no QR code" message)
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Scanner start error:', err);
      setScanError('Failed to start camera. Please refresh the page and try again.');
    } finally {
      setStarting(false);
    }
  }, [onScan, onOpenChange, stopScanner]);

  // ---------- open / close ----------
  useEffect(() => {
    if (open) {
      // wait a tick for the dialog to render the container
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

  // ---------- manual entry ----------
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
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black">
            <QrCode className="h-5 w-5 text-primary" /> Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Scan the customer's QR code or enter the Bill ID manually.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="scan" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="font-bold">
              <QrCode className="h-4 w-4 mr-2" /> Scan QR
            </TabsTrigger>
            <TabsTrigger value="manual" className="font-bold">
              <Keyboard className="h-4 w-4 mr-2" /> Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            {/* Loading state */}
            {starting && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Accessing camera…</p>
              </div>
            )}

            {/* Error state */}
            {scanError && !starting && (
              <div className="text-center py-8">
                <X className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{scanError}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    stopScanner();
                    startScanner();
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Camera view – always show the container */}
            <div
              id={scannerContainerId}
              className="w-full rounded-xl overflow-hidden"
              style={{ minHeight: scanning ? 300 : 0 }}
            />
          </TabsContent>

          <TabsContent value="manual">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bill ID
                </Label>
                <Input
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="Paste or type the Bill ID"
                  className="rounded-xl"
                />
              </div>
              <Button
                onClick={handleManualSubmit}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl font-bold"
              >
                Look Up Bill
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}