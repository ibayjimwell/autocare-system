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

import {
  Button,
} from '@/components/ui/button';

import {
  Input,
} from '@/components/ui/input';

import {
  Label,
} from '@/components/ui/label';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import {
  Html5Qrcode,
} from 'html5-qrcode';

import {
  finalBillsApi,
} from '@/lib/payments/final-bills';

import {
  Keyboard,
  Loader2,
  QrCode,
  ScanLine,
  X,
} from 'lucide-react';

import {
  toast,
} from 'sonner';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (
    open: boolean,
  ) => void;
  onScan: (
    billId: string,
  ) => void;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function QRScannerModal({
  open,
  onOpenChange,
  onScan,
}: QRScannerModalProps) {
  /* ==============================================================
     MANUAL ENTRY
  ============================================================== */

  const [
    manualId,
    setManualId,
  ] = useState('');

  const [
    manualLookupLoading,
    setManualLookupLoading,
  ] = useState(false);

  /* ==============================================================
     SCANNER
  ============================================================== */

  const [
    scanError,
    setScanError,
  ] = useState<
    string | null
  >(null);

  const [
    scanning,
    setScanning,
  ] = useState(false);

  const [
    starting,
    setStarting,
  ] = useState(false);

  const scannerRef =
    useRef<Html5Qrcode | null>(
      null,
    );

  const scannerContainerId =
    'qr-reader-container';

  /* ==============================================================
     STOP SCANNER
  ============================================================== */

  const stopScanner =
    useCallback(
      async () => {
        if (
          scannerRef.current
        ) {
          try {
            await scannerRef.current.stop();
          } catch (
            err
          ) {
            console.error(
              'Error stopping scanner:',
              err,
            );
          }

          scannerRef.current =
            null;
        }

        setScanning(
          false,
        );

        setStarting(
          false,
        );
      },
      [],
    );

  /* ==============================================================
     START SCANNER
  ============================================================== */

  const startScanner =
    useCallback(
      async () => {
        setScanError(
          null,
        );

        setStarting(
          true,
        );

        /*
         * Request camera permission first.
         *
         * The temporary stream is immediately stopped because
         * html5-qrcode will create and manage its own scanner stream.
         */
        try {
          const stream =
            await navigator.mediaDevices.getUserMedia(
              {
                video: {
                  facingMode:
                    'environment',
                },
              },
            );

          stream
            .getTracks()
            .forEach(
              track =>
                track.stop(),
            );
        } catch (
          err: any
        ) {
          console.error(
            'Camera permission denied:',
            err,
          );

          setScanError(
            'Camera access denied. Please allow camera permissions in your browser settings.',
          );

          setStarting(
            false,
          );

          return;
        }

        const container =
          document.getElementById(
            scannerContainerId,
          );

        if (
          !container
        ) {
          setScanError(
            'Scanner container not found.',
          );

          setStarting(
            false,
          );

          return;
        }

        try {
          const scanner =
            new Html5Qrcode(
              scannerContainerId,
            );

          scannerRef.current =
            scanner;

          await scanner.start(
            {
              facingMode:
                'environment',
            },
            {
              fps: 10,
              qrbox: {
                width: 250,
                height: 250,
              },
              aspectRatio: 1.0,
            },
            (
              decodedText: string,
            ) => {
              /*
               * QR behavior remains the same.
               */
              stopScanner().catch(
                console.error,
              );

              onScan(
                decodedText,
              );

              onOpenChange(
                false,
              );
            },
            () => {},
          );

          setScanning(
            true,
          );
        } catch (
          err: any
        ) {
          console.error(
            'Scanner start error:',
            err,
          );

          setScanError(
            'Failed to start camera. Please refresh the page and try again.',
          );
        } finally {
          setStarting(
            false,
          );
        }
      },
      [
        onScan,
        onOpenChange,
        stopScanner,
      ],
    );

  /* ==============================================================
     OPEN / CLOSE EFFECT
  ============================================================== */

  useEffect(() => {
    if (
      open
    ) {
      /*
       * Give Radix Dialog time to mount the scanner container before
       * html5-qrcode tries to find it.
       */
      const timer =
        window.setTimeout(
          () => {
            void startScanner();
          },
          400,
        );

      return () => {
        window.clearTimeout(
          timer,
        );

        void stopScanner();
      };
    }

    void stopScanner();

    setScanError(
      null,
    );

    setStarting(
      false,
    );

    setManualId(
      '',
    );

    setManualLookupLoading(
      false,
    );

    return () => {
      void stopScanner();
    };
  }, [
    open,
    startScanner,
    stopScanner,
  ]);

  /* ==============================================================
     MANUAL BILL ID
  ============================================================== */

  const handleManualSubmit =
    async () => {
      const trimmed =
        manualId
          .trim()
          .replace(
            /^#/,
            '',
          )
          .toUpperCase();

      if (
        !trimmed
      ) {
        toast.error(
          'Please enter a valid Bill ID.',
        );

        return;
      }

      /*
       * Resolve the displayed short Bill ID to the real UUID before
       * continuing through the existing payment/cashier flow.
       */
      setManualLookupLoading(
        true,
      );

      try {
        const result =
          await finalBillsApi.resolveBillId(
            trimmed,
          );

        if (
          result?.error ||
          !result?.data
        ) {
          toast.error(
            result?.errorMessage ||
              `Bill ID "${trimmed}" was not found.`,
          );

          return;
        }

        onScan(
          result.data,
        );

        setManualId(
          '',
        );

        onOpenChange(
          false,
        );
      } catch (
        err: any
      ) {
        console.error(
          'Manual Bill ID lookup failed:',
          err,
        );

        toast.error(
          err?.message ||
            'Failed to look up the Bill ID.',
        );
      } finally {
        setManualLookupLoading(
          false,
        );
      }
    };

  /* ==============================================================
     INPUT KEYBOARD SUBMIT
  ============================================================== */

  const handleManualKeyDown =
    (
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (
        event.key !==
        'Enter'
      ) {
        return;
      }

      event.preventDefault();

      if (
        !manualLookupLoading
      ) {
        void handleManualSubmit();
      }
    };

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent
        className="
          flex
          h-[calc(100dvh-1rem)]
          max-h-[calc(100dvh-1rem)]
          w-[calc(100vw-1rem)]
          max-w-md
          flex-col
          overflow-hidden
          rounded-xl
          border border-border
          bg-card
          p-0
          shadow-2xl
          sm:h-auto
          sm:max-h-[calc(100dvh-2rem)]
          sm:w-full
        "
      >
        {/* ========================================================
            HEADER
        ========================================================= */}

        <div className="shrink-0 border-b border-border bg-background/80 p-4 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <QrCode className="h-5 w-5 text-primary" />

              Scan QR Code
            </DialogTitle>

            <DialogDescription>
              Scan the customer's QR code or enter the Bill ID from
              the Final Cost table manually.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ========================================================
            SCROLLABLE CONTENT
        ========================================================= */}

        <div
          className="
            min-h-0
            flex-1
            overflow-x-hidden
            overflow-y-auto
            overscroll-contain
            touch-pan-y
            [-webkit-overflow-scrolling:touch]
            p-4
            sm:p-5
          "
        >
          <Tabs
            defaultValue="scan"
            className="w-full"
          >
            {/* ====================================================
                TABS
            ===================================================== */}

            <TabsList className="grid h-11 w-full grid-cols-2 rounded-md bg-muted/60 p-1 md:h-9">
              <TabsTrigger
                value="scan"
                className={`rounded-sm text-sm ${focusClass}`}
                disabled={
                  manualLookupLoading
                }
              >
                <ScanLine className="mr-2 h-4 w-4" />
                Scan QR
              </TabsTrigger>

              <TabsTrigger
                value="manual"
                className={`rounded-sm text-sm ${focusClass}`}
                disabled={
                  manualLookupLoading
                }
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            {/* ====================================================
                SCAN TAB
            ===================================================== */}

            <TabsContent
              value="scan"
              className="mt-4"
            >
              {starting && (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border bg-muted/20 sm:min-h-[280px]">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />

                  <p className="text-sm text-muted-foreground">
                    Accessing camera...
                  </p>
                </div>
              )}

              {scanError &&
                !starting && (
                  <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/[0.03] px-6 text-center sm:min-h-[280px]">
                    <X className="mb-3 h-8 w-8 text-destructive" />

                    <p className="text-sm leading-5 text-muted-foreground">
                      {scanError}
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      className={`mt-4 h-11 rounded-md md:h-9 ${focusClass}`}
                      onClick={() => {
                        void stopScanner();

                        void startScanner();
                      }}
                      disabled={
                        manualLookupLoading
                      }
                    >
                      Try Again
                    </Button>
                  </div>
                )}

              {/* ==================================================
                  SCANNER VIEWPORT
              =================================================== */}

              <div className="w-full overflow-hidden rounded-lg border border-border bg-black/5">
                <div
                  id={
                    scannerContainerId
                  }
                  className="w-full overflow-hidden"
                  style={{
                    minHeight:
                      scanning
                        ? 260
                        : 0,
                  }}
                />
              </div>

              {scanning && (
                <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                  Position the customer's QR code inside the scanner
                  frame.
                </p>
              )}
            </TabsContent>

            {/* ====================================================
                MANUAL TAB
            ===================================================== */}

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
                    value={
                      manualId
                    }
                    onChange={event =>
                      setManualId(
                        event.target.value,
                      )
                    }
                    onKeyDown={
                      handleManualKeyDown
                    }
                    placeholder="e.g. 32DBD79E"
                    maxLength={
                      36
                    }
                    autoComplete="off"
                    spellCheck={
                      false
                    }
                    disabled={
                      manualLookupLoading
                    }
                    className={`h-11 rounded-md font-mono text-base uppercase md:h-9 md:text-sm ${focusClass}`}
                  />

                  <p className="text-xs leading-5 text-muted-foreground">
                    Enter the 8-character Bill ID displayed in the
                    Final Cost table, such as{' '}
                    <span className="font-mono font-semibold text-foreground">
                      32DBD79E
                    </span>
                    .
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() =>
                    void handleManualSubmit()
                  }
                  disabled={
                    manualLookupLoading ||
                    !manualId.trim()
                  }
                  className={`h-11 w-full rounded-md md:h-9 ${focusClass}`}
                >
                  {manualLookupLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking Up Bill...
                    </>
                  ) : (
                    <>
                      <Keyboard className="mr-2 h-4 w-4" />
                      Look Up Bill
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <div className="shrink-0 border-t border-border p-4">
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(
                  false,
                )
              }
              disabled={
                manualLookupLoading
              }
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