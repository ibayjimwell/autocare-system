'use client';

import React from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ReceiptText,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { formatCurrency } from '@/app-utils/payments/payments';

interface Finding {
  id: string;
  description?: string;
  included?: boolean;
  partsSubtotal?: string | number;
}

interface EstimateLike {
  id: string;
  grandTotal?: string | number;
  findings?: Finding[];
}

interface ApproveEstimateConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimate: EstimateLike | null;
  onConfirm: () => void | Promise<void>;
  saving?: boolean;
}

function money(value: unknown) {
  const numeric = Number(value);
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0);
}

export default function ApproveEstimateConfirmationModal({
  open,
  onOpenChange,
  estimate,
  onConfirm,
  saving = false,
}: ApproveEstimateConfirmationModalProps) {
  const findings = Array.isArray(estimate?.findings)
    ? estimate.findings
    : [];

  const selectedFindings = findings.filter(
    (finding) => finding?.included !== false,
  );

  const hasNoFindings = selectedFindings.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="
          w-[calc(100%-1rem)] max-w-2xl rounded-xl border border-border bg-card p-0
          sm:w-[calc(100%-2rem)]
        "
      >
        <div className="border-b border-border bg-background/80 p-4 backdrop-blur-xl sm:p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Confirm Estimate Approval
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-5">
          <div className="rounded-lg border border-primary/15 bg-primary/[0.04] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Amount after selection
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                  ₱{money(estimate?.grandTotal)}
                </p>
              </div>
              <ReceiptText className="h-6 w-6 text-primary" />
            </div>
          </div>

          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Findings to be performed
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  These findings are checked in the estimate.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {selectedFindings.length} selected
              </span>
            </div>

            {hasNoFindings ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-900">
                  No diagnostic findings are selected.
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Approving will continue with the remaining estimate charges, such as selected services and adjustments.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {selectedFindings.map((finding, index) => (
                  <div
                    key={finding.id || `finding-${index}`}
                    className={`flex items-start gap-3 px-4 py-3 ${
                      index > 0 ? 'border-t border-border' : ''
                    }`}
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {finding.description || 'Finding'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Finding subtotal: ₱{money(finding.partsSubtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {findings.some((finding) => finding?.included === false) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-5 text-muted-foreground">
                  Unselected findings are not part of the approved work and their reserved inventory will be restored.
                </p>
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="border-t border-border bg-background/70 p-4 backdrop-blur-xl sm:p-5">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="h-10 w-full rounded-md px-4 sm:w-auto"
            >
              Go Back
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void onConfirm()}
              className="h-10 w-full rounded-md bg-primary px-4 text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              {saving ? 'Approving…' : 'Approve & Start Work'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
