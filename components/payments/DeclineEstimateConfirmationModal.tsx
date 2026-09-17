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
  Label,
} from '@/components/ui/label';

import {
  Textarea,
} from '@/components/ui/textarea';

import {
  AlertTriangle,
  XCircle,
} from 'lucide-react';

import type {
  Estimate,
} from '@/hooks/payments/usePaymentsData';

/* ================================================================
   PROPS
================================================================ */

interface DeclineEstimateConfirmationModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  estimate: Estimate | null;

  onConfirm: (
    reason: string,
  ) => void;

  saving: boolean;
}

/* ================================================================
   COMPONENT
================================================================ */

export default function DeclineEstimateConfirmationModal({
  open,
  onOpenChange,
  estimate,
  onConfirm,
  saving,
}: DeclineEstimateConfirmationModalProps) {
  const [
    reason,
    setReason,
  ] = useState('');

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
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
      setReason('');
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
    const trimmed =
      reason.trim();

    if (
      !estimate ||
      saving ||
      !confirmed ||
      trimmed.length <
        3
    ) {
      return;
    }

    onConfirm(
      trimmed,
    );
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
            <XCircle
              className="
                h-5
                w-5
                text-destructive
              "
            />

            Confirm Estimate Decline
          </DialogTitle>

          <DialogDescription
            className="
              text-sm
              leading-6
            "
          >
            Provide a reason and confirm before declining this estimate.
          </DialogDescription>
        </DialogHeader>

        <div
          className="
            space-y-4
          "
        >
          {/* ====================================================
              ESTIMATE INFORMATION
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
                    text-xl
                    font-bold
                    text-primary
                  "
                >
                  ₱
                  {Number(
                    estimate?.grandTotal ||
                      0,
                  ).toFixed(
                    2,
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
              border-destructive/20
              bg-destructive/5
              p-4
            "
          >
            <AlertTriangle
              className="
                mt-0.5
                h-5
                w-5
                shrink-0
                text-destructive
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
                Declining the estimate changes its state and prevents the current approval action from being completed. You are responsible for this action.
              </p>
            </div>
          </div>

          {/* ====================================================
              REASON
          ===================================================== */}

          <div
            className="
              space-y-2
            "
          >
            <Label
              className="
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-muted-foreground
              "
            >
              Reason for Declining
            </Label>

            <Textarea
              value={
                reason
              }
              onChange={(
                event,
              ) =>
                setReason(
                  event.target
                    .value,
                )
              }
              placeholder="Enter the reason for declining this estimate..."
              disabled={
                saving
              }
              maxLength={
                500
              }
              className="
                min-h-[120px]
                resize-none
                rounded-md
                text-base

                md:text-sm
              "
            />

            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <p
                className="
                  text-xs
                  text-muted-foreground
                "
              >
                At least 3 characters are required.
              </p>

              <p
                className="
                  text-xs
                  text-muted-foreground
                "
              >
                {
                  reason.length
                }
                /500
              </p>
            </div>
          </div>

          {/* ====================================================
              RESPONSIBILITY CONSENT
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
              I have reviewed the estimate, understand that declining it cannot be undone, and accept responsibility for this action.
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
            variant="destructive"
            onClick={
              handleConfirm
            }
            disabled={
              !estimate ||
              !confirmed ||
              reason.trim()
                .length <
                3 ||
              saving
            }
            className="
              h-11
              w-full
              rounded-md

              sm:w-auto
            "
          >
            <AlertTriangle
              className="
                mr-2
                h-4
                w-4
              "
            />

            {saving
              ? 'Declining...'
              : 'Confirm Decline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}