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
  AlertCircle,
  Barcode,
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';

import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (
    open: boolean,
  ) => void;
  onDetected: (
    barcode: string,
  ) => void;
  title?: string;
  description?: string;
}

type CameraPermissionState =
  | 'unknown'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unsupported';

const SCANNER_ID =
  'autocare-inventory-barcode-scanner';

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const supportedFormats = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

export default function BarcodeScannerModal({
  open,
  onOpenChange,
  onDetected,
  title = 'Scan Barcode',
  description = 'Use your device camera to scan a barcode.',
}: BarcodeScannerModalProps) {
  /* ==============================================================
     REFERENCES
  ============================================================== */

  const scannerRef =
    useRef<Html5Qrcode | null>(
      null,
    );

  const detectedRef =
    useRef(false);

  const startRequestRef =
    useRef(0);

  /* ==============================================================
     STATE
  ============================================================== */

  const [
    starting,
    setStarting,
  ] = useState(false);

  const [
    scanning,
    setScanning,
  ] = useState(false);

  const [
    scanError,
    setScanError,
  ] = useState<string | null>(
    null,
  );

  const [
    permissionState,
    setPermissionState,
  ] =
    useState<CameraPermissionState>(
      'unknown',
    );

  /* ==============================================================
     CAMERA SUPPORT
  ============================================================== */

  const hasCameraSupport =
    typeof window !==
      'undefined' &&
    typeof navigator !==
      'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices
      .getUserMedia ===
      'function';

  /* ==============================================================
     CHECK CAMERA PERMISSION
  ============================================================== */

  const checkCameraPermission =
    useCallback(
      async () => {
        if (
          typeof window ===
          'undefined'
        ) {
          return 'unknown' as CameraPermissionState;
        }

        if (
          !navigator.mediaDevices ||
          typeof navigator.mediaDevices
            .getUserMedia !==
            'function'
        ) {
          setPermissionState(
            'unsupported',
          );

          return 'unsupported';
        }

        /*
         * The Permissions API is not supported consistently across
         * all mobile browsers, so failure here does not mean the
         * camera itself is unavailable.
         */
        try {
          if (
            navigator.permissions &&
            typeof navigator.permissions
              .query ===
              'function'
          ) {
            const permission =
              await navigator.permissions.query(
                {
                  name: 'camera' as PermissionName,
                },
              );

            const state =
              permission.state;

            if (
              state ===
              'granted'
            ) {
              setPermissionState(
                'granted',
              );

              return 'granted';
            }

            if (
              state ===
              'denied'
            ) {
              setPermissionState(
                'denied',
              );

              return 'denied';
            }

            setPermissionState(
              'prompt',
            );

            return 'prompt';
          }
        } catch (
          error
        ) {
          /*
           * Safari and some mobile browsers can reject
           * Permissions API camera queries. In that case we fall
           * back to getUserMedia(), which is the authoritative
           * permission mechanism.
           */
          console.log(
            '[BarcodeScanner] Camera permission query unavailable:',
            error,
          );
        }

        setPermissionState(
          'unknown',
        );

        return 'unknown';
      },
      [],
    );

  /* ==============================================================
     STOP MEDIA TRACKS FROM PERMISSION REQUEST
  ============================================================== */

  const requestCameraPermission =
    useCallback(
      async () => {
        if (
          !hasCameraSupport
        ) {
          throw new Error(
            'Camera access is not supported by this browser.',
          );
        }

        /*
         * Camera access requires a secure browser context.
         *
         * localhost is normally allowed, but an ordinary HTTP
         * network address on a phone is generally not.
         */
        if (
          !window.isSecureContext &&
          window.location.hostname !==
            'localhost' &&
          window.location.hostname !==
            '127.0.0.1'
        ) {
          throw new Error(
            'Camera access requires a secure HTTPS connection. Open AutoCare using HTTPS or localhost.',
          );
        }

        /*
         * IMPORTANT:
         *
         * This explicit getUserMedia() call is what causes the
         * browser's native camera permission dialog to appear.
         *
         * We immediately stop this temporary stream. Html5Qrcode
         * opens its own camera stream afterward.
         */
        let stream: MediaStream | null =
          null;

        try {
          stream =
            await navigator.mediaDevices.getUserMedia(
              {
                video: {
                  facingMode: {
                    ideal:
                      'environment',
                  },
                  width: {
                    ideal: 1280,
                  },
                  height: {
                    ideal: 720,
                  },
                },
                audio: false,
              },
            );

          setPermissionState(
            'granted',
          );

          return stream;
        } catch (
          firstError: any
        ) {
          console.warn(
            '[BarcodeScanner] Environment-camera permission request failed:',
            firstError,
          );

          /*
           * Some devices reject the facingMode constraint even
           * though camera access itself is available.
           *
           * Retry with the simplest possible video request.
           */
          try {
            stream =
              await navigator.mediaDevices.getUserMedia(
                {
                  video: true,
                  audio: false,
                },
              );

            setPermissionState(
              'granted',
            );

            return stream;
          } catch (
            secondError: any
          ) {
            console.error(
              '[BarcodeScanner] Camera permission request failed:',
              secondError,
            );

            const name =
              secondError?.name ||
              firstError?.name ||
              '';

            if (
              name ===
                'NotAllowedError' ||
              name ===
                'PermissionDeniedError'
            ) {
              setPermissionState(
                'denied',
              );

              throw new Error(
                'Camera permission was denied. Allow camera access for this site in your browser settings, then tap Try Again.',
              );
            }

            if (
              name ===
                'NotFoundError' ||
              name ===
                'DevicesNotFoundError'
            ) {
              throw new Error(
                'No camera was found on this device.',
              );
            }

            if (
              name ===
                'NotReadableError' ||
              name ===
                'TrackStartError'
            ) {
              throw new Error(
                'The camera is currently being used by another application or browser tab. Close other camera apps/tabs and try again.',
              );
            }

            if (
              name ===
                'SecurityError'
            ) {
              throw new Error(
                'The browser blocked camera access for security reasons. Make sure AutoCare is running over HTTPS.',
              );
            }

            throw new Error(
              secondError?.message ||
                firstError?.message ||
                'Unable to access the camera.',
            );
          }
        } finally {
          /*
           * Release the temporary permission stream.
           */
          if (stream) {
            stream
              .getTracks()
              .forEach(
                track => {
                  try {
                    track.stop();
                  } catch {
                    // Ignore already-stopped tracks.
                  }
                },
              );
          }
        }
      },
      [hasCameraSupport],
    );

  /* ==============================================================
     GET AVAILABLE CAMERAS
  ============================================================== */

  const getPreferredCamera =
    useCallback(
      async () => {
        /*
         * Camera labels are usually populated only AFTER camera
         * permission has been granted.
         */
        const cameras =
          await Html5Qrcode.getCameras();

        if (
          !cameras ||
          cameras.length ===
            0
        ) {
          throw new Error(
            'No camera was found on this device.',
          );
        }

        /*
         * Prefer the rear/environment camera.
         *
         * Browser camera labels can differ between devices, so use
         * several common words before falling back to the first
         * available camera.
         */
        const preferred =
          cameras.find(
            camera => {
              const label =
                String(
                  camera.label ??
                    '',
                ).toLowerCase();

              return (
                label.includes(
                  'back',
                ) ||
                label.includes(
                  'rear',
                ) ||
                label.includes(
                  'environment',
                ) ||
                label.includes(
                  'world',
                )
              );
            },
          );

        return (
          preferred ??
          cameras[0]
        );
      },
      [],
    );

  /* ==============================================================
     STOP SCANNER
  ============================================================== */

  const stopScanner =
    useCallback(
      async () => {
        /*
         * Increment this token so an older asynchronous start
         * operation cannot start scanning after the user closes the
         * modal.
         */
        startRequestRef.current +=
          1;

        const scanner =
          scannerRef.current;

        scannerRef.current =
          null;

        if (scanner) {
          try {
            if (
              scanner.isScanning
            ) {
              await scanner.stop();
            }
          } catch (
            error
          ) {
            console.error(
              '[BarcodeScanner] Stop error:',
              error,
            );
          }

          try {
            scanner.clear();
          } catch (
            error
          ) {
            /*
             * html5-qrcode can already have removed its DOM when an
             * interrupted camera session occurs.
             */
            console.log(
              '[BarcodeScanner] Clear skipped:',
              error,
            );
          }
        }

        /*
         * Clear scanner DOM contents as a final safety measure.
         */
        if (
          typeof document !==
          'undefined'
        ) {
          const container =
            document.getElementById(
              SCANNER_ID,
            );

          if (
            container
          ) {
            container.innerHTML =
              '';
          }
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
      async (
        fromUserAction = false,
      ) => {
        if (
          !open
        ) {
          return;
        }

        /*
         * Prevent duplicate scanner instances.
         */
        if (
          scannerRef.current
        ) {
          return;
        }

        const requestId =
          ++startRequestRef.current;

        setScanError(
          null,
        );

        setStarting(
          true,
        );

        setScanning(
          false,
        );

        detectedRef.current =
          false;

        /*
         * Make sure the Dialog has mounted the scanner element.
         */
        const container =
          document.getElementById(
            SCANNER_ID,
          );

        if (
          !container
        ) {
          setScanError(
            'The camera area is not ready yet. Tap Try Again.',
          );

          setStarting(
            false,
          );

          return;
        }

        try {
          /*
           * --------------------------------------------------------
           * STEP 1 — PERMISSION
           * --------------------------------------------------------
           */

          let currentPermission =
            await checkCameraPermission();

          /*
           * If permission is already granted, getUserMedia() still
           * runs once. This validates that the browser/device can
           * actually open the camera.
           */
          if (
            currentPermission !==
              'granted' ||
            fromUserAction
          ) {
            await requestCameraPermission();

            currentPermission =
              'granted';
          } else {
            /*
             * Validate the existing permission by opening and
             * immediately releasing a camera stream.
             */
            await requestCameraPermission();

            currentPermission =
              'granted';
          }

          if (
            requestId !==
            startRequestRef.current
          ) {
            return;
          }

          if (
            currentPermission !==
            'granted'
          ) {
            throw new Error(
              'Camera permission is required before scanning.',
            );
          }

          /*
           * --------------------------------------------------------
           * STEP 2 — CAMERA SELECTION
           * --------------------------------------------------------
           */

          const camera =
            await getPreferredCamera();

          if (
            requestId !==
            startRequestRef.current
          ) {
            return;
          }

          if (
            !camera?.id
          ) {
            throw new Error(
              'No usable camera was found.',
            );
          }

          /*
           * --------------------------------------------------------
           * STEP 3 — CREATE SCANNER
           * --------------------------------------------------------
           */

          const scanner =
            new Html5Qrcode(
              SCANNER_ID,
              {
                verbose: false,
              },
            );

          scannerRef.current =
            scanner;

          /*
           * --------------------------------------------------------
           * STEP 4 — START WITH SELECTED CAMERA
           * --------------------------------------------------------
           *
           * Using an explicit camera ID is more reliable than
           * relying only on facingMode after permission has already
           * been granted.
           */

          try {
            await scanner.start(
              {
                deviceId: {
                  exact:
                    camera.id,
                },
              },
              {
                fps: 10,

                qrbox: (
                  viewfinderWidth,
                  viewfinderHeight,
                ) => {
                  const minDimension =
                    Math.min(
                      viewfinderWidth,
                      viewfinderHeight,
                    );

                  /*
                   * Barcode scanning works better with a wide
                   * scanning region than the traditional QR square.
                   */
                  return {
                    width: Math.min(
                      420,
                      Math.max(
                        220,
                        Math.floor(
                          minDimension *
                            0.82,
                        ),
                      ),
                    ),

                    height: Math.min(
                      180,
                      Math.max(
                        100,
                        Math.floor(
                          minDimension *
                            0.38,
                        ),
                      ),
                    ),
                  };
                },

                aspectRatio:
                  1.7777778,

                disableFlip:
                  true,

                formatsToSupport:
                  supportedFormats,
              },
              (
                decodedText,
              ) => {
                const normalized =
                  String(
                    decodedText ??
                      '',
                  ).trim();

                if (
                  !normalized ||
                  detectedRef.current
                ) {
                  return;
                }

                detectedRef.current =
                  true;

                console.log(
                  '[BarcodeScanner] Barcode detected:',
                  normalized,
                );

                /*
                 * Stop the camera before delivering the result.
                 */
                void stopScanner();

                onDetected(
                  normalized,
                );
              },
              () => {
                /*
                 * Frame decode failures are expected while a barcode
                 * is not currently visible.
                 */
              },
            );
          } catch (
            deviceError
          ) {
            /*
             * ------------------------------------------------------
             * FALLBACK
             * ------------------------------------------------------
             *
             * A browser/device can sometimes report a valid camera
             * but reject the explicit device constraint. Retry with
             * the environment-facing configuration.
             */
            console.warn(
              '[BarcodeScanner] Explicit device start failed. Retrying with environment camera:',
              deviceError,
            );

            /*
             * Stop/clear the failed scanner instance before retrying.
             */
            try {
              if (
                scanner.isScanning
              ) {
                await scanner.stop();
              }
            } catch {
              // Ignore failed cleanup.
            }

            try {
              scanner.clear();
            } catch {
              // Ignore failed cleanup.
            }

            scannerRef.current =
              null;

            const fallbackScanner =
              new Html5Qrcode(
                SCANNER_ID,
                {
                  verbose: false,
                },
              );

            scannerRef.current =
              fallbackScanner;

            await fallbackScanner.start(
              {
                facingMode:
                  'environment',
              },
              {
                fps: 10,

                qrbox: (
                  viewfinderWidth,
                  viewfinderHeight,
                ) => {
                  const minDimension =
                    Math.min(
                      viewfinderWidth,
                      viewfinderHeight,
                    );

                  return {
                    width: Math.min(
                      420,
                      Math.max(
                        220,
                        Math.floor(
                          minDimension *
                            0.82,
                        ),
                      ),
                    ),

                    height: Math.min(
                      180,
                      Math.max(
                        100,
                        Math.floor(
                          minDimension *
                            0.38,
                        ),
                      ),
                    ),
                  };
                },

                aspectRatio:
                  1.7777778,

                disableFlip:
                  true,

                formatsToSupport:
                  supportedFormats,
              },
              (
                decodedText,
              ) => {
                const normalized =
                  String(
                    decodedText ??
                      '',
                  ).trim();

                if (
                  !normalized ||
                  detectedRef.current
                ) {
                  return;
                }

                detectedRef.current =
                  true;

                console.log(
                  '[BarcodeScanner] Barcode detected:',
                  normalized,
                );

                void stopScanner();

                onDetected(
                  normalized,
                );
              },
              () => {},
            );
          }

          if (
            requestId !==
            startRequestRef.current
          ) {
            await stopScanner();
            return;
          }

          setScanning(
            true,
          );

          setPermissionState(
            'granted',
          );
        } catch (
          error: any
        ) {
          if (
            requestId !==
            startRequestRef.current
          ) {
            return;
          }

          console.error(
            '[BarcodeScanner] Start error:',
            error,
          );

          const message =
            error?.message ||
            'Unable to start the camera. Please allow camera permission and try again.';

          setScanError(
            message,
          );

          /*
           * Do not leave a half-created scanner behind after an
           * interrupted start.
           */
          const scanner =
            scannerRef.current;

          scannerRef.current =
            null;

          if (
            scanner
          ) {
            try {
              if (
                scanner.isScanning
              ) {
                await scanner.stop();
              }
            } catch {
              // Ignore cleanup errors.
            }

            try {
              scanner.clear();
            } catch {
              // Ignore cleanup errors.
            }
          }

          if (
            message.toLowerCase().includes(
              'permission',
            )
          ) {
            setPermissionState(
              'denied',
            );
          }
        } finally {
          if (
            requestId ===
            startRequestRef.current
          ) {
            setStarting(
              false,
            );
          }
        }
      },
      [
        open,
        checkCameraPermission,
        requestCameraPermission,
        getPreferredCamera,
        onDetected,
        stopScanner,
      ],
    );

  /* ==============================================================
     OPEN / CLOSE
  ============================================================== */

  useEffect(() => {
    if (
      !open
    ) {
      void stopScanner();

      setScanError(
        null,
      );

      setPermissionState(
        'unknown',
      );

      return undefined;
    }

    detectedRef.current =
      false;

    setScanError(
      null,
    );

    /*
     * Wait for Radix Dialog to finish mounting the content.
     */
    const timer =
      window.setTimeout(
        () => {
          /*
           * Try automatically first.
           *
           * On browsers requiring a user gesture, this can fail
           * gracefully and the Enable Camera button will remain
           * available.
           */
          void startScanner(
            false,
          );
        },
        250,
      );

    return () => {
      window.clearTimeout(
        timer,
      );

      void stopScanner();
    };
  }, [
    open,
    startScanner,
    stopScanner,
  ]);

  /* ==============================================================
     CLOSE
  ============================================================== */

  const handleClose =
    async () => {
      await stopScanner();

      onOpenChange(
        false,
      );
    };

  /* ==============================================================
     PERMISSION BUTTON
  ============================================================== */

  const handleEnableCamera =
    async () => {
      await stopScanner();

      setScanError(
        null,
      );

      await startScanner(
        true,
      );
    };

  /* ==============================================================
     PERMISSION HELP TEXT
  ============================================================== */

  const getPermissionHelp =
    () => {
      if (
        !hasCameraSupport
      ) {
        return 'This browser does not provide camera access. Use a modern browser with camera support.';
      }

      if (
        permissionState ===
        'denied'
      ) {
        return 'Camera access is blocked. Allow camera access for this AutoCare site in your browser settings, then tap Try Again.';
      }

      if (
        typeof window !==
          'undefined' &&
        !window.isSecureContext &&
        window.location.hostname !==
          'localhost' &&
        window.location.hostname !==
          '127.0.0.1'
      ) {
        return 'Camera access requires HTTPS. Open AutoCare using a secure HTTPS address or localhost.';
      }

      return (
        scanError ||
        'Camera access is required. Tap Enable Camera and allow the browser permission request.'
      );
    };

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <Dialog
      open={open}
      onOpenChange={
        nextOpen => {
          if (
            !nextOpen
          ) {
            void handleClose();

            return;
          }

          onOpenChange(
            true,
          );
        }
      }
    >
      <DialogContent
        className="
          flex
          h-[calc(100dvh-1rem)]
          max-h-[calc(100dvh-1rem)]
          w-[calc(100vw-1rem)]
          max-w-lg
          flex-col
          overflow-hidden
          rounded-2xl
          p-0
          sm:max-h-[calc(100dvh-2rem)]
          sm:w-full
        "
      >
        {/* ========================================================
            HEADER
        ========================================================= */}

        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Barcode className="h-5 w-5 text-primary" />

            {title}
          </DialogTitle>

          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* ========================================================
            SCROLLABLE BODY
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
          <div className="space-y-4">

            {/* ====================================================
                CAMERA VIEW
            ===================================================== */}

            <div className="overflow-hidden rounded-2xl border border-border bg-black">
              <div
                id={
                  SCANNER_ID
                }
                className="
                  min-h-[260px]
                  w-full
                  overflow-hidden
                  bg-black
                  sm:min-h-[360px]
                "
              />
            </div>

            {/* ====================================================
                STARTING
            ===================================================== */}

            {starting && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />

                Requesting camera access...
              </div>
            )}

            {/* ====================================================
                CAMERA READY
            ===================================================== */}

            {scanning &&
              !scanError && (
                <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Camera className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Ready to scan
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Keep the barcode centered in the camera
                      view. AutoCare will stop scanning as soon as
                      a barcode is detected.
                    </p>
                  </div>
                </div>
              )}

            {/* ====================================================
                CAMERA / PERMISSION ERROR
            ===================================================== */}

            {scanError &&
              !starting && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        Camera unavailable
                      </p>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {getPermissionHelp()}
                      </p>
                    </div>
                  </div>

                  {/* ==================================================
                      ENABLE / RETRY
                  =================================================== */}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      onClick={() =>
                        void handleEnableCamera()
                      }
                      disabled={
                        starting ||
                        !hasCameraSupport
                      }
                      className={`h-11 w-full rounded-md sm:flex-1 md:h-9 ${focusClass}`}
                    >
                      {starting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="mr-2 h-4 w-4" />
                      )}

                      Enable Camera
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void stopScanner();

                        window.setTimeout(
                          () => {
                            void startScanner(
                              true,
                            );
                          },
                          150,
                        );
                      }}
                      disabled={
                        starting
                      }
                      className={`h-11 w-full rounded-md sm:flex-1 md:h-9 ${focusClass}`}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />

                      Try Again
                    </Button>
                  </div>
                </div>
              )}

            {/* ====================================================
                INITIAL PERMISSION PROMPT
            ===================================================== */}

            {!scanning &&
              !starting &&
              !scanError &&
              permissionState !==
                'granted' && (
                <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Camera className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        Camera permission required
                      </p>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        AutoCare needs access to your device camera
                        to scan inventory barcodes.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() =>
                      void handleEnableCamera()
                    }
                    className={`mt-4 h-11 w-full rounded-md md:h-9 ${focusClass}`}
                  >
                    <Camera className="mr-2 h-4 w-4" />

                    Enable Camera
                  </Button>
                </div>
              )}

            {/* ====================================================
                CAMERA PERMISSION SECURITY
            ===================================================== */}

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Camera permission
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Your browser controls camera access. The first
                  time you use the scanner, choose Allow when your
                  browser asks for camera permission.
                </p>
              </div>
            </div>

            {/* ====================================================
                SUPPORTED FORMATS
            ===================================================== */}

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Supported barcode formats
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  AutoCare supports common automotive and retail
                  barcode formats including Code 128, Code 39,
                  Code 93, EAN, UPC, ITF, and Codabar.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <DialogFooter className="shrink-0 border-t border-border p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void handleClose()
            }
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