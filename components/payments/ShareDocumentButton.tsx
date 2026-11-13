'use client';

import { useState } from 'react';
import {
  QrCode,
  Copy,
  Download,
  ExternalLink,
  RotateCcw,
  Loader2,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Kind = 'estimate' | 'final-bill';
type LinkData = { id: string; url: string; expiresAt: string };
type ActiveLink = { id: string; expiresAt: string; createdAt: string };

export default function ShareDocumentButton({
  kind,
  documentId,
  compact = false,
}: {
  kind: Kind;
  documentId: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [existing, setExisting] = useState<ActiveLink[]>([]);
  const [qrFailed, setQrFailed] = useState(false);
  const [qrRetry, setQrRetry] = useState(0);

  const loadExisting = async () => {
    try {
      const res = await fetch(
        `/api/payments/share-links?kind=${kind}&documentId=${encodeURIComponent(documentId)}`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      if (res.ok && !data.error) {
        setExisting(data.data || []);
      }
    } catch {
      // Creating and sharing a new link does not depend on loading old links.
    }
  };

  const generate = async () => {
    setError('');
    setQrFailed(false);
    setLoading(true);
    try {
      const res = await fetch('/api/payments/share-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, documentId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.errorMessage || 'Unable to create document link.');
      }
      setValue(json.data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to create QR code.',
      );
    } finally {
      setLoading(false);
    }
  };

  const show = () => {
    setOpen(true);
    setValue(null);
    setQrFailed(false);
    setQrRetry(0);
    setError('');
    setExisting([]);
    void loadExisting();
    void generate();
  };

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Clipboard unavailable. Copy the URL manually below.');
    }
  };

  const revoke = async () => {
    if (!value) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/share-links/${value.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Could not revoke link.');
      setValue(null);
      setExisting((rows) => rows.filter((row) => row.id !== value.id));
      setError('Link revoked. Generate a new one to share the document.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to revoke link.',
      );
    } finally {
      setLoading(false);
    }
  };

  const revokePrevious = async () => {
    const previous = existing.filter((row) => row.id !== value?.id);
    if (!previous.length) return;
    setLoading(true);
    setError('');
    try {
      for (const row of previous) {
        const res = await fetch(`/api/payments/share-links/${row.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          throw new Error('One or more previous links could not be revoked.');
        }
      }
      setExisting((rows) =>
        rows.filter((row) => !previous.some((old) => old.id === row.id)),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to revoke old links.',
      );
    } finally {
      setLoading(false);
    }
  };

  // The image endpoint is authenticated and checks the share URL's origin.
  // The retry parameter ensures a failed image can be requested again.
  const qrSrc = value
    ? `/api/payments/share-links/qr?url=${encodeURIComponent(value.url)}&retry=${qrRetry}`
    : '';
  const isLocalLink = value
    ? /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/share\//i.test(
        value.url,
      )
    : false;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={show}
        className="min-h-9 gap-1.5"
        aria-label={`Show ${kind === 'estimate' ? 'estimate' : 'Final Cost'} QR code`}
      >
        <QrCode className="h-4 w-4" />
        {compact ? 'QR' : 'Show QR'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] overflow-y-auto rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {kind === 'estimate' ? 'Estimate' : 'Final Cost'} — Share QR code
            </DialogTitle>
            <DialogDescription>
              Scan using the phone camera or copy the secure URL. The customer
              can view and download the full document without signing in.
            </DialogDescription>
          </DialogHeader>

          {loading && !value ? (
            <div className="flex min-h-44 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : null}

          {value ? (
            <div className="space-y-4">
              <div className="flex min-h-[292px] items-center justify-center rounded-xl border border-border bg-white p-4">
                {qrFailed ? (
                  <div className="flex flex-col items-center gap-3 px-4 text-center text-sm text-red-700" role="alert">
                    <AlertCircle size={26} aria-hidden="true" />
                    <span>
                      The QR image could not load. You can still copy the
                      secure link below, or retry generating the image.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => {
                        setQrFailed(false);
                        setQrRetry((current) => current + 1);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Retry QR image
                    </Button>
                  </div>
                ) : (
                  // Staff-only first-party QR SVG; the private link is never
                  // sent to a third-party QR generation service.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={qrSrc}
                    src={qrSrc}
                    width={260}
                    height={260}
                    alt="QR code to open the secure document"
                    className="h-[260px] w-[260px] max-w-full object-contain"
                    onError={() => setQrFailed(true)}
                  />
                )}
              </div>

              {isLocalLink ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                  Local preview: this QR opens localhost. Phones cannot reach
                  your computer through their own localhost address. To share
                  with customers, generate the QR on your deployed HTTPS site.
                </p>
              ) : null}

              <label className="block text-xs font-semibold text-muted-foreground">
                Shareable URL
                <input
                  readOnly
                  value={value.url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground md:text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" className="min-h-11" onClick={() => void copy()}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy URL'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() =>
                    window.open(value.url, '_blank', 'noopener,noreferrer')
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <a
                  className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
                  href={`/api/public/payment-documents/${new URL(value.url).pathname.split('/').pop()}/pdf`}
                  download
                >
                  <Download className="h-4 w-4" />
                  Download as PDF
                </a>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Expires{' '}
                {new Date(value.expiresAt).toLocaleString('en-PH', {
                  timeZone: 'Asia/Manila',
                })}{' '}
                (PH time)
              </p>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => void revoke()}
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                Revoke this link
              </Button>

              {existing.some((row) => row.id !== value.id) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={() => void revokePrevious()}
                >
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Revoke previous links (
                  {existing.filter((row) => row.id !== value.id).length})
                </Button>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {!value && !loading ? (
            <Button type="button" onClick={() => void generate()}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Generate secure link
            </Button>
          ) : null}

          <p className="text-xs leading-5 text-muted-foreground">
            Anyone with the URL can view its contents until expiration or
            revocation. Share it only with the intended customer.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
