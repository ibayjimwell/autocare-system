'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import {
  Button,
} from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  formatCurrency,
} from '@/app-utils/payments/payments';

import {
  useQrPhPayment,
} from '@/hooks/payments/useQrPhPayment';

interface QRPhPaymentClientProps {
  billId: string;
}

function getCustomerName(bill: any) {
  const customer = bill?.appointment?.customer ?? bill?.customer;

  return (
    customer?.fullname ??
    customer?.fullName ??
    customer?.name ??
    'Customer'
  );
}

function getRemainingTime(expiresAt: number | null, now: number) {
  if (!expiresAt) return null;

  const remainingSeconds = Math.max(
    0,
    Math.ceil((expiresAt - now) / 1000),
  );

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return {
    remainingSeconds,
    label: `${minutes}:${String(seconds).padStart(2, '0')}`,
  };
}

export default function QRPhPaymentClient({
  billId,
}: QRPhPaymentClientProps) {
  const router = useRouter();

  const {
    bill,
    loadingBill,
    creatingQr,
    verifying,
    paid,
    qrImageUrl,
    testUrl,
    expiresAt,
    error,
    createQr,
    verifyPayment,
  } = useQrPhPayment(billId);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const remaining = useMemo(
    () => getRemainingTime(expiresAt, now),
    [expiresAt, now],
  );

  const expired = Boolean(
    remaining && remaining.remainingSeconds <= 0,
  );

  const status = String(bill?.status ?? '').toUpperCase();
  const amount = Number.parseFloat(String(bill?.grandTotal ?? 0)) || 0;

  useEffect(() => {
    if (
      !loadingBill &&
      bill &&
      status === 'OFFICIAL' &&
      !paid &&
      !qrImageUrl &&
      !creatingQr &&
      !error
    ) {
      void createQr();
    }
  }, [
    loadingBill,
    bill,
    status,
    paid,
    qrImageUrl,
    creatingQr,
    error,
    createQr,
  ]);

  if (loadingBill) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          Loading Final Cost…
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">
              {error || 'Final Cost was not found.'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => router.push('/payments')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paid || status === 'PAID') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Card className="overflow-hidden border-green-200">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="h-11 w-11" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
              Payment Successful
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              PayMongo confirmed the QRPh payment. The Final Cost is now marked as Paid in AutoCare.
            </p>
            <div className="mt-6 w-full rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
                Amount Paid
              </p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                ₱{formatCurrency(amount)}
              </p>
            </div>
            <Button
              type="button"
              className="mt-6 w-full"
              onClick={() => router.push('/payments')}
            >
              Return to Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status !== 'OFFICIAL') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-xl font-semibold text-foreground">
              Final Cost is not ready for QRPh payment
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Current status: <span className="font-semibold">{status || 'UNKNOWN'}</span>. QRPh is available only for Official Final Costs.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => router.push('/payments')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/payments')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Payments
        </Button>

        <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
          Official Final Cost
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/20">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Pay using QRPh</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scan the dynamic QR using a QRPh-compatible banking or e-wallet app. The encoded amount is fixed to this Final Cost.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Final Cost
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                  #{String(bill.id).slice(0, 8).toUpperCase()}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  {getCustomerName(bill)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Amount Due
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
                ₱{formatCurrency(amount)}
              </p>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Secure payment confirmation
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  AutoCare does not mark this bill as Paid from the browser alone. The server verifies the Payment Intent with PayMongo, while the Final Cost also listens for real-time status updates.
                </p>
              </div>
            </div>

            {testUrl ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  PayMongo test mode
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Use the PayMongo test page to simulate an authorized QRPh payment instead of scanning the generated test QR.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={() => window.open(testUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open PayMongo Test Authorization
                </Button>
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scan to Pay</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col items-center p-5 pt-0 sm:p-6 sm:pt-0">
            {creatingQr ? (
              <div className="flex h-[300px] w-full max-w-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Generating secure QRPh code…
                </p>
              </div>
            ) : qrImageUrl && !expired ? (
              <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                {/* PayMongo returns a Base64 data URI for dynamic QRPh. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt="QRPh payment QR code"
                  className="h-[268px] w-[268px] object-contain"
                />
              </div>
            ) : (
              <div className="flex h-[300px] w-full max-w-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
                <QrCode className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {expired
                    ? 'This QRPh code has expired. Generate a new one to continue.'
                    : 'The QRPh code is not available yet.'}
                </p>
              </div>
            )}

            {remaining && !expired && qrImageUrl ? (
              <p className="mt-4 text-sm font-medium text-foreground">
                Expires in {remaining.label}
              </p>
            ) : null}

            <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
              Scan using your bank or e-wallet app that supports QRPh / InstaPay, then complete the payment in that app.
            </p>

            <div className="mt-5 grid w-full gap-2">
              {expired || !qrImageUrl ? (
                <Button
                  type="button"
                  onClick={() => void createQr()}
                  disabled={creatingQr || verifying}
                >
                  {creatingQr ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Generate New QRPh
                </Button>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={() => void verifyPayment(undefined, true)}
                disabled={!qrImageUrl || creatingQr || verifying}
              >
                {verifying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                {verifying ? 'Checking Payment…' : 'Check Payment Status'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
