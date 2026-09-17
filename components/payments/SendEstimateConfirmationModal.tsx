'use client';

import React, {
  useMemo,
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
  Badge,
} from '@/components/ui/badge';

import {
  Checkbox,
} from '@/components/ui/checkbox';

import {
  ScrollArea,
} from '@/components/ui/scroll-area';

import {
  AlertTriangle,
  Car,
  ClipboardList,
  FileCheck2,
  Package,
  ReceiptText,
  Send,
  User,
  Wrench,
} from 'lucide-react';

import type {
  Estimate,
} from '@/hooks/payments/usePaymentsData';

/* ================================================================
   PROPS
================================================================ */

interface SendEstimateConfirmationModalProps {
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

function toNumber(
  value: unknown,
): number {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric,
    )
  ) {
    return 0;
  }

  return numeric;
}

function formatMoney(
  value: unknown,
): string {
  return `₱${Math.abs(
    toNumber(value),
  ).toFixed(2)}`;
}

function formatDiscount(
  value: unknown,
): string {
  const amount =
    Math.abs(
      toNumber(value),
    );

  if (
    amount <
    0.005
  ) {
    return '₱0.00';
  }

  return `-₱${amount.toFixed(
    2,
  )}`;
}

function getPartTotal(
  part: any,
): number {
  const explicit =
    toNumber(
      part?.totalPrice,
    );

  if (
    explicit > 0
  ) {
    return explicit;
  }

  return (
    toNumber(
      part?.quantity ||
        1,
    ) *
    toNumber(
      part?.priceAtTime,
    )
  );
}

/* ================================================================
   COMPONENT
================================================================ */

export default function SendEstimateConfirmationModal({
  open,
  onOpenChange,
  estimate,
  onConfirm,
  saving,
}: SendEstimateConfirmationModalProps) {
  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  /* ==============================================================
     DERIVED DATA
  ============================================================== */

  const services =
    useMemo(
      () =>
        estimate
          ?.appointment
          ?.services || [],
      [estimate],
    );

  const findings =
    estimate?.findings ||
    [];

  const fees =
    estimate?.fees ||
    [];

  const discounts =
    estimate?.discounts ||
    [];

  const tasks =
    estimate?.tasks ||
    [];

  const totalService =
    toNumber(
      estimate?.serviceSubtotal,
    );

  const totalFindings =
    toNumber(
      estimate?.findingsSubtotal,
    );

  const totalFees =
    toNumber(
      estimate?.feesTotal,
    );

  const totalDiscount =
    toNumber(
      estimate?.discountTotal,
    );

  const grandTotal =
    toNumber(
      estimate?.grandTotal,
    );

  const customerName =
    estimate
      ?.appointment
      ?.customer
      ?.fullname ||
    'Customer';

  const vehicle =
    estimate
      ?.appointment
      ?.vehicle;

  const trackingNumber =
    estimate
      ?.appointment
      ?.trackingNumber ||
    estimate?.appointmentId;

  /* ==============================================================
     CLOSE / OPEN
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
      !confirmed ||
      saving ||
      !estimate
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
          flex
          h-[min(92vh,860px)]
          max-h-[92vh]
          w-[calc(100%-1rem)]
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-border
          bg-card
          p-0
          shadow-2xl

          sm:w-[calc(100%-2rem)]
          sm:max-w-4xl
        "
      >
        {/* ======================================================
            HEADER
        ======================================================= */}

        <DialogHeader
          className="
            shrink-0
            border-b
            border-border
            p-4

            sm:p-5
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-md
                bg-primary/10
                text-primary
              "
            >
              <FileCheck2
                className="
                  h-5
                  w-5
                "
              />
            </div>

            <div
              className="
                min-w-0
              "
            >
              <DialogTitle
                className="
                  text-lg
                  font-semibold
                  tracking-tight

                  sm:text-xl
                "
              >
                Confirm Estimate Submission
              </DialogTitle>

              <DialogDescription
                className="
                  mt-1
                  text-sm
                  leading-5
                "
              >
                Review the complete estimate carefully before sending it to the customer for approval.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ======================================================
            SCROLLABLE CONTENT
        ======================================================= */}

        <ScrollArea
          className="
            min-h-0
            flex-1
          "
        >
          <div
            className="
              space-y-4
              p-4

              sm:p-5
            "
          >
            {/* ==================================================
                NOTICE
            =================================================== */}

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

              <div
                className="
                  min-w-0
                "
              >
                <p
                  className="
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  Double-check the estimate
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-muted-foreground
                  "
                >
                  Once sent, this estimate moves to customer approval. Pending-only editing and removal of fees or discounts will no longer be available.
                </p>
              </div>
            </div>

            {/* ==================================================
                CUSTOMER / VEHICLE
            =================================================== */}

            <section
              className="
                rounded-xl
                border
                border-border
                bg-background
              "
            >
              <div
                className="
                  border-b
                  border-border
                  px-4
                  py-3
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
                  Customer & Vehicle
                </p>
              </div>

              <div
                className="
                  grid
                  gap-3
                  p-4

                  sm:grid-cols-2
                "
              >
                <InfoItem
                  icon={
                    User
                  }
                  label="Customer"
                  value={
                    customerName
                  }
                />

                <InfoItem
                  icon={
                    Car
                  }
                  label="Vehicle"
                  value={
                    vehicle
                      ? `${vehicle.make || ''} ${
                          vehicle.model ||
                          ''
                        }`.trim() ||
                        'Vehicle'
                      : 'Vehicle'
                  }
                />

                <InfoItem
                  icon={
                    Car
                  }
                  label="Plate Number"
                  value={
                    vehicle
                      ?.plateNumber ||
                    'N/A'
                  }
                />

                <InfoItem
                  icon={
                    ReceiptText
                  }
                  label="Tracking"
                  value={
                    trackingNumber ||
                    'N/A'
                  }
                />
              </div>
            </section>

            {/* ==================================================
                SERVICES
            =================================================== */}

            <EstimateSection
              icon={
                Wrench
              }
              title="Services"
              count={
                services.length
              }
            >
              {services.length ===
              0 ? (
                <EmptyLine
                  text="No service items."
                />
              ) : (
                services.map(
                  (
                    service: any,
                    index: number,
                  ) => (
                    <LineItem
                      key={
                        service?.id ||
                        index
                      }
                      label={
                        service?.name ||
                        'Service'
                      }
                      value={formatMoney(
                        service?.basePrice,
                      )}
                    />
                  ),
                )
              )}

              <SubtotalLine
                label="Service Subtotal"
                value={formatMoney(
                  totalService,
                )}
              />
            </EstimateSection>

            {/* ==================================================
                FINDINGS
            =================================================== */}

            <EstimateSection
              icon={
                Package
              }
              title="Findings & Parts"
              count={
                findings.length
              }
            >
              {findings.length ===
              0 ? (
                <EmptyLine
                  text="No findings recorded."
                />
              ) : (
                findings.map(
                  (
                    finding: any,
                    findingIndex: number,
                  ) => (
                    <div
                      key={
                        finding?.id ||
                        findingIndex
                      }
                      className="
                        space-y-2
                        rounded-lg
                        border
                        border-border
                        bg-card
                        p-3
                      "
                    >
                      <p
                        className="
                          text-sm
                          font-semibold
                          text-foreground
                        "
                      >
                        {finding
                          ?.description ||
                          finding?.title ||
                          'Finding'}
                      </p>

                      {(
                        finding?.parts ||
                        []
                      ).length ===
                      0 ? (
                        <p
                          className="
                            text-xs
                            text-muted-foreground
                          "
                        >
                          No parts attached.
                        </p>
                      ) : (
                        <div
                          className="
                            space-y-1.5
                          "
                        >
                          {finding.parts.map(
                            (
                              part: any,
                              partIndex: number,
                            ) => (
                              <LineItem
                                key={
                                  part?.id ||
                                  partIndex
                                }
                                label={`${part?.quantity || 1}× ${
                                  part?.partName ||
                                  'Part'
                                }`}
                                value={
                                  part?.isPms
                                    ? 'PMS'
                                    : formatMoney(
                                        getPartTotal(
                                          part,
                                        ),
                                      )
                                }
                                muted={
                                  Boolean(
                                    part?.isPms,
                                  )
                                }
                              />
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  ),
                )
              )}

              <SubtotalLine
                label="Findings Subtotal"
                value={formatMoney(
                  totalFindings,
                )}
              />
            </EstimateSection>

            {/* ==================================================
                TASKS
            =================================================== */}

            <EstimateSection
              icon={
                ClipboardList
              }
              title="Tasks"
              count={
                tasks.length
              }
            >
              {tasks.length ===
              0 ? (
                <EmptyLine
                  text="No task records."
                />
              ) : (
                tasks.map(
                  (
                    task: any,
                    index: number,
                  ) => (
                    <div
                      key={
                        task?.id ||
                        index
                      }
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        rounded-md
                        bg-card
                        px-3
                        py-2
                      "
                    >
                      <div
                        className="
                          min-w-0
                        "
                      >
                        <p
                          className="
                            truncate
                            text-sm
                            font-medium
                            text-foreground
                          "
                        >
                          {task
                            ?.title ||
                            'Task'}
                        </p>
                      </div>

                      <Badge
                        variant="secondary"
                        className="
                          shrink-0
                          rounded-md
                          text-[10px]
                        "
                      >
                        {task
                          ?.status ||
                          'DONE'}
                      </Badge>
                    </div>
                  ),
                )
              )}
            </EstimateSection>

            {/* ==================================================
                FEES
            =================================================== */}

            <EstimateSection
              icon={
                Wrench
              }
              title="Fees / Labor"
              count={
                fees.length
              }
            >
              {fees.length ===
              0 ? (
                <EmptyLine
                  text="No additional fees."
                />
              ) : (
                fees.map(
                  (
                    fee: any,
                    index: number,
                  ) => (
                    <LineItem
                      key={
                        fee?.id ||
                        index
                      }
                      label={
                        fee?.title ||
                        'Fee'
                      }
                      value={formatMoney(
                        fee?.amount,
                      )}
                    />
                  ),
                )
              )}

              <SubtotalLine
                label="Fees Subtotal"
                value={formatMoney(
                  totalFees,
                )}
              />
            </EstimateSection>

            {/* ==================================================
                DISCOUNTS
            =================================================== */}

            <EstimateSection
              icon={
                ReceiptText
              }
              title="Discounts"
              count={
                discounts.length
              }
            >
              {discounts.length ===
              0 ? (
                <EmptyLine
                  text="No discounts."
                />
              ) : (
                discounts.map(
                  (
                    discount: any,
                    index: number,
                  ) => (
                    <LineItem
                      key={
                        discount?.id ||
                        index
                      }
                      label={`${discount?.title || 'Discount'}${
                        discount?.type
                          ? ` (${discount.type})`
                          : ''
                      }`}
                      value={formatDiscount(
                        discount?.amount,
                      )}
                      negative
                    />
                  ),
                )
              )}

              <SubtotalLine
                label="Discount Total"
                value={formatDiscount(
                  totalDiscount,
                )}
                negative
              />
            </EstimateSection>

            {/* ==================================================
                GRAND TOTAL
            =================================================== */}

            <section
              className="
                rounded-xl
                border
                border-primary/20
                bg-primary/[0.035]
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
                    Estimate Total
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-muted-foreground
                    "
                  >
                    Amount to be presented to customer
                  </p>
                </div>

                <p
                  className="
                    text-2xl
                    font-bold
                    tracking-tight
                    text-primary
                  "
                >
                  {formatMoney(
                    grandTotal,
                  )}
                </p>
              </div>
            </section>

            {/* ==================================================
                CONSENT
            =================================================== */}

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

              <span>
                <span
                  className="
                    block
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  I reviewed this estimate
                </span>

                <span
                  className="
                    mt-1
                    block
                    text-xs
                    leading-5
                    text-muted-foreground
                  "
                >
                  I confirm that the services, findings, parts, fees, discounts, and total amount shown above have been double-checked and are ready to be sent to the customer.
                </span>
              </span>
            </label>
          </div>
        </ScrollArea>

        {/* ======================================================
            FOOTER
        ======================================================= */}

        <DialogFooter
          className="
            shrink-0
            border-t
            border-border
            bg-muted/20
            p-3

            sm:p-4
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
              h-10
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
              h-10
              w-full
              rounded-md

              sm:w-auto
            "
          >
            {saving ? (
              'Sending...'
            ) : (
              <>
                <Send
                  className="
                    mr-2
                    h-4
                    w-4
                  "
                />

                Confirm & Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
   INFO ITEM
================================================================ */

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-3
        rounded-lg
        border
        border-border
        bg-card
        p-3
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-md
          bg-muted/50
          text-muted-foreground
        "
      >
        <Icon
          className="
            h-4
            w-4
          "
        />
      </div>

      <div
        className="
          min-w-0
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
          {
            label
          }
        </p>

        <p
          className="
            mt-1
            truncate
            text-sm
            font-medium
            text-foreground
          "
        >
          {
            value
          }
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   ESTIMATE SECTION
================================================================ */

function EstimateSection({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="
        rounded-xl
        border
        border-border
        bg-background
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          border-b
          border-border
          px-4
          py-3
        "
      >
        <div
          className="
            flex
            items-center
            gap-2.5
          "
        >
          <div
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-md
              bg-primary/10
              text-primary
            "
          >
            <Icon
              className="
                h-4
                w-4
              "
            />
          </div>

          <p
            className="
              text-sm
              font-semibold
              text-foreground
            "
          >
            {
              title
            }
          </p>
        </div>

        <Badge
          variant="secondary"
          className="
            rounded-full
            text-[10px]
          "
        >
          {
            count
          }
        </Badge>
      </div>

      <div
        className="
          space-y-2
          p-4
        "
      >
        {
          children
        }
      </div>
    </section>
  );
}

/* ================================================================
   LINE ITEM
================================================================ */

function LineItem({
  label,
  value,
  negative = false,
  muted = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        border-b
        border-border/70
        py-2
        last:border-b-0
      "
    >
      <span
        className={
          muted
            ? 'text-xs text-muted-foreground'
            : 'text-sm text-foreground'
        }
      >
        {
          label
        }
      </span>

      <span
        className={
          negative
            ? 'shrink-0 text-sm font-semibold text-destructive'
            : 'shrink-0 text-sm font-semibold text-foreground'
        }
      >
        {
          value
        }
      </span>
    </div>
  );
}

/* ================================================================
   SUBTOTAL
================================================================ */

function SubtotalLine({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div
      className="
        mt-2
        flex
        items-center
        justify-between
        border-t
        border-border
        pt-3
      "
    >
      <span
        className="
          text-xs
          font-semibold
          uppercase
          tracking-wider
          text-muted-foreground
        "
      >
        {
          label
        }
      </span>

      <span
        className={
          negative
            ? 'text-sm font-bold text-destructive'
            : 'text-sm font-bold text-primary'
        }
      >
        {
          value
        }
      </span>
    </div>
  );
}

/* ================================================================
   EMPTY
================================================================ */

function EmptyLine({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="
        rounded-lg
        border
        border-dashed
        border-border
        bg-card
        px-3
        py-4
        text-center
      "
    >
      <p
        className="
          text-xs
          text-muted-foreground
        "
      >
        {
          text
        }
      </p>
    </div>
  );
}