'use client';

import React, {
  useEffect,
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
  Checkbox,
} from '@/components/ui/checkbox';

import {
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import type {
  Estimate,
} from '@/hooks/payments/usePaymentsData';

/* ================================================================
   PROPS
================================================================ */

interface ApproveEstimateConfirmationModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  estimate: Estimate | null;

  onConfirm: () => void;

  saving: boolean;
}

/* ================================================================
   HELPERS
================================================================ */

function formatMoney(
  value: unknown,
): string {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric,
    )
  ) {
    return '₱0.00';
  }

  return `₱${Math.abs(
    numeric,
  ).toFixed(2)}`;
}

/* ================================================================
   COMPONENT
================================================================ */

export default function ApproveEstimateConfirmationModal({
  open,
  onOpenChange,
  estimate,
  onConfirm,
  saving,
}: ApproveEstimateConfirmationModalProps) {
  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmed(false);
    }
  }, [
    open,
  ]);

  /* ==============================================================
     OPEN CHANGE
  ============================================================== */

  const handleOpenChange = (
    nextOpen: boolean,
  ) => {
    if (!nextOpen) {
      setConfirmed(false);
    }

    onOpenChange(
      nextOpen,
    );
  };

  /* ==============================================================
     CONFIRM
  ============================================================== */

  const handleConfirm = () => {
    if (
      !estimate ||
      !confirmed ||
      saving
    ) {
      return;
    }

    onConfirm();
  };

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <Dialog
      open={open}
      onOpenChange={
        handleOpenChange
      }
    >
      <DialogContent
        className="
          w-[calc(100%-1rem)]
          rounded-xl
          border
          border-border
          bg-card
          shadow-2xl

          sm:max-w-lg
        "
      >
        <DialogHeader>
          <DialogTitle
            className="
              flex
              items-center
              gap-2
              text-lg
              font-semibold
            "
          >
            <CheckCircle2
              className="
                h-5
                w-5
                text-primary
              "
            />

            Confirm Estimate Approval
          </DialogTitle>

          <DialogDescription
            className="
              text-sm
              leading-6
            "
          >
            Review this estimate before approving it.
          </DialogDescription>
        </DialogHeader>

        <div
          className="
            space-y-4
          "
        >
          {/* ====================================================
              ESTIMATE SUMMARY
          ===================================================== */}

          <div
            className="
              rounded-xl
              border
              border-border
              bg-background
              p-4
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-4
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  Estimate
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    font-medium
                    text-foreground
                  "
                >
                  #
                  {estimate?.id
                    ?.slice(
                      0,
                      8,
                    )
                    .toUpperCase() ||
                    'N/A'}
                </p>
              </div>

              <div
                className="
                  text-right
                "
              >
                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  Total
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-bold
                    tracking-tight
                    text-primary
                  "
                >
                  {formatMoney(
                    estimate?.grandTotal,
                  )}
                </p>
              </div>
            </div>

            {estimate
              ?.appointment
              ?.customer
              ?.fullname && (
              <div
                className="
                  mt-4
                  border-t
                  border-border
                  pt-3
                "
              >
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  Customer
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    font-medium
                    text-foreground
                  "
                >
                  {
                    estimate
                      .appointment
                      .customer
                      .fullname
                  }
                </p>
              </div>
            )}
          </div>

          {/* ====================================================
              WARNING
          ===================================================== */}

          <div
            className="
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-amber-500/20
              bg-amber-500/5
              p-4
            "
          >
            <AlertTriangle
              className="
                mt-0.5
                h-5
                w-5
                shrink-0
                text-amber-600
              "
            />

            <div>
              <p
                className="
                  text-sm
                  font-semibold
                  text-foreground
                "
              >
                This action cannot be undone.
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-muted-foreground
                "
              >
                By approving this estimate, the estimate is accepted and the service workflow can proceed. You are responsible for this action.
              </p>
            </div>
          </div>

          {/* ====================================================
              CONSENT
          ===================================================== */}

          <label
            className="
              flex
              cursor-pointer
              items-start
              gap-3
              rounded-xl
              border
              border-border
              bg-muted/20
              p-4
            "
          >
            <Checkbox
              checked={
                confirmed
              }
              onCheckedChange={(
                checked,
              ) =>
                setConfirmed(
                  Boolean(
                    checked,
                  ),
                )
              }
              className="
                mt-0.5
              "
            />

            <span
              className="
                text-sm
                leading-5
                text-foreground
              "
            >
              I have reviewed the estimate and understand that approval cannot be undone. I accept responsibility for this approval action.
            </span>
          </label>
        </div>

        {/* ======================================================
            FOOTER
        ======================================================= */}

        <DialogFooter
          className="
            flex-col-reverse
            gap-2

            sm:flex-row
          "
        >
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              handleOpenChange(
                false,
              )
            }
            disabled={
              saving
            }
            className="
              h-11
              w-full
              rounded-md

              sm:w-auto
            "
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={
              handleConfirm
            }
            disabled={
              !confirmed ||
              saving ||
              !estimate
            }
            className="
              h-11
              w-full
              rounded-md

              sm:w-auto
            "
          >
            {saving
              ? 'Approving...'
              : 'Confirm Approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}