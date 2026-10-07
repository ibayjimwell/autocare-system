import {
  Loader2,
} from 'lucide-react';

export default function QRPhPaymentLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        Loading QRPh payment…
      </div>
    </div>
  );
}
