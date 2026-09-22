'use client';

import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Button,
} from '@/components/ui/button';

import {
  cn,
} from '@/lib/utils';

import {
  formatCurrency,
} from '@/app-utils/payments/payments';

import {
  format,
} from 'date-fns';

import StatusBadge from '@/components/shared/status-badge';

import LoadingSpinner from '@/components/shared/loading-spinner';

import ServiceCard from '@/components/services/service-card';

import {
  CheckCircle,
  Eye,
  FileText,
  Pencil,
  Percent,
  Plus,
  PlusCircle,
  ReceiptText,
  Tag,
  Trash2,
  Wrench,
} from 'lucide-react';

/* ================================================================
   PROPS
================================================================ */

interface DetailModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  detailType:
    | 'estimate'
    | 'final-bill';

  selectedItem: any;

  detailLoading: boolean;

  onAddFee: (form: {
    title: string;
    amount: string;
    findingId: string;
  }) => void;

  onAddDiscount: (form: {
    title: string;
    type: string;
    value: string;
  }) => void;

  onEditPart: (
    part: any,
    findingId: string,
    billId: string,
  ) => void;

  onDeletePart: (
    part: any,
    findingId: string,
    billId: string,
  ) => void;

  onEditFee: (fee: any) => void;

  onDeleteFee: (fee: any) => void;

  onEditDiscount: (discount: any) => void;

  onDeleteDiscount: (discount: any) => void;

  feeModalOpen: boolean;

  setFeeModalOpen: (
    open: boolean,
  ) => void;

  feeForm: {
    title: string;
    amount: string;
    findingId: string;
  };

  setFeeForm: (
    form: {
      title: string;
      amount: string;
      findingId: string;
    },
  ) => void;

  discountModalOpen: boolean;

  setDiscountModalOpen: (
    open: boolean,
  ) => void;

  discountForm: {
    title: string;
    type: string;
    value: string;
  };

  setDiscountForm: (
    form: {
      title: string;
      type: string;
      value: string;
    },
  ) => void;

  editPartModalOpen: boolean;

  setEditPartModalOpen: (
    open: boolean,
  ) => void;

  editingPart: any;

  editPartForm: {
    quantity: number;
    priceAtTime: number;
  };

  setEditPartForm: (
    form: {
      quantity: number;
      priceAtTime: number;
    },
  ) => void;

  submittingAdjustment: boolean;

  onSaveFee: () => void;

  onSaveDiscount: () => void;

  onSavePart: () => void;
}

/* ================================================================
   SAFE HELPERS
================================================================ */

/**
 * Convert unknown numeric values into a safe number.
 */
function toSafeNumber(
  value: unknown,
): number {
  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

/**
 * Normalize arrays before rendering.
 */
function safeArray(
  value: unknown,
): any[] {
  return Array.isArray(
    value,
  )
    ? value
    : [];
}

/**
 * Safely format a money value.
 *
 * The payment utility already handles normal numeric/string values,
 * but this wrapper guarantees the modal never receives an invalid
 * numeric value.
 */
function safeCurrency(
  value: unknown,
): string {
  return formatCurrency(
    toSafeNumber(
      value,
    ),
  );
}

/**
 * Safely format a date.
 *
 * date-fns can throw when passed an invalid date. Never allow an
 * invalid database value to crash the entire payment page.
 */
function safeDate(
  value: unknown,
): string {
  if (
    !value
  ) {
    return 'Not available';
  }

  try {
    const date =
      new Date(
        String(
          value,
        ),
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return 'Not available';
    }

    return format(
      date,
      'MMM dd, yyyy',
    );
  } catch (
    error
  ) {
    console.error(
      '[DetailModal] Invalid date:',
      error,
    );

    return 'Not available';
  }
}

/**
 * Normalize services for rendering.
 */
function getServiceIds(
  appointment: any,
): string[] {
  const services =
    safeArray(
      appointment?.services,
    );

  return services
    .map(
      (
        service: any,
      ) => {
        if (
          typeof service ===
          'string'
        ) {
          return service;
        }

        return (
          service?.id ??
          service?.serviceId ??
          null
        );
      },
    )
    .filter(
      (
        id,
      ): id is string =>
        Boolean(
          id,
        ),
    );
}

/**
 * Normalize finding parts for rendering.
 */
function getFindingParts(
  finding: any,
): any[] {
  if (
    Array.isArray(
      finding?.parts,
    )
  ) {
    return finding.parts;
  }

  if (
    Array.isArray(
      finding?.products,
    )
  ) {
    return finding.products;
  }

  return [];
}

/**
 * Safely calculate finding subtotal when the API doesn't provide it.
 */
function getFindingSubtotal(
  finding: any,
): number {
  const explicit =
    toSafeNumber(
      finding?.partsSubtotal,
    );

  if (
    explicit > 0
  ) {
    return explicit;
  }

  return getFindingParts(
    finding,
  ).reduce(
    (
      total: number,
      part: any,
    ) => {
      if (
        part?.isPms
      ) {
        return total;
      }

      const quantity =
        Math.max(
          1,
          toSafeNumber(
            part?.quantity,
          ) ||
            1,
        );

      const price =
        Math.max(
          0,
          toSafeNumber(
            part?.priceAtTime ??
              part?.price,
          ),
        );

      return (
        total +
        quantity *
          price
      );
    },
    0,
  );
}

/**
 * Safely get the Final Cost findings.
 */
function getFindings(
  selectedItem: any,
): any[] {
  const source =
    Array.isArray(
      selectedItem?.findings,
    )
      ? selectedItem.findings
      : [];

  return source.map(
    (
      finding: any,
      index: number,
    ) => ({
      ...finding,

      id:
        finding?.id ??
        `finding-${index}`,

      description:
        finding?.description ??
        finding?.title ??
        'Finding',

      included:
        finding?.included !==
        false,

      parts:
        getFindingParts(
          finding,
        ),
    }),
  );
}

/* ================================================================
   COMPONENT
================================================================ */

export default function DetailModal({
  open,
  onOpenChange,
  detailType,
  selectedItem,
  detailLoading,
  onAddFee,
  onAddDiscount,
  onEditPart,
  onDeletePart,
  onEditFee,
  onDeleteFee,
  onEditDiscount,
  onDeleteDiscount,
  feeModalOpen,
  setFeeModalOpen,
  feeForm,
  setFeeForm,
  discountModalOpen,
  setDiscountModalOpen,
  discountForm,
  setDiscountForm,
  editPartModalOpen,
  setEditPartModalOpen,
  editingPart,
  editPartForm,
  setEditPartForm,
  submittingAdjustment,
  onSaveFee,
  onSaveDiscount,
  onSavePart,
}: DetailModalProps) {
  /*
   * Keep the existing behavior:
   *
   * no selected record + no loading = nothing to show.
   */
  if (
    !selectedItem &&
    !detailLoading
  ) {
    return null;
  }

  const isFinalBillEditable =
    detailType ===
      'final-bill' &&
    (selectedItem?.status ===
      'PENDING' ||
      selectedItem?.status ===
        'PARKED');

  const isEditable =
    detailType ===
      'estimate' ||
    isFinalBillEditable;

  /*
   * Safe data references.
   */
  const findings =
    getFindings(
      selectedItem,
    );

  const fees =
    safeArray(
      selectedItem?.fees,
    );

  const discounts =
    safeArray(
      selectedItem?.discounts,
    );

  const workTasks =
    safeArray(
      selectedItem?.workTasks,
    );

  const inspectionTasks =
    safeArray(
      selectedItem?.tasks,
    );

  const serviceIds =
    getServiceIds(
      selectedItem?.appointment,
    );

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
          max-h-[92vh]
          w-[calc(100%-1rem)]
          flex-col
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
          p-0
          shadow-2xl

          sm:max-w-4xl

          md:w-[calc(100%-2rem)]
        "
      >
        {/* ========================================================
            HEADER
        ========================================================= */}

        <div
          className="
            shrink-0
            border-b
            border-border
            bg-background/80
            p-4
            backdrop-blur-xl

            sm:p-5
          "
        >
          <DialogHeader>
            <DialogTitle
              className="
                flex
                flex-col
                gap-3
                text-lg
                font-semibold

                sm:flex-row
                sm:items-center
                sm:justify-between

                md:text-xl
              "
            >
              <span className="flex items-center gap-2">
                {detailType ===
                'estimate' ? (
                  <FileText className="h-5 w-5 text-primary" />
                ) : (
                  <ReceiptText className="h-5 w-5 text-primary" />
                )}

                {detailType ===
                'estimate'
                  ? 'Estimate Details'
                  : 'Final Cost Details'}
              </span>

              {selectedItem && (
                <StatusBadge
                  status={
                    selectedItem.status ||
                    'PENDING'
                  }
                  className="w-fit text-[10px]"
                />
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* ========================================================
            BODY
        ========================================================= */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            p-4

            sm:p-5

            [-webkit-overflow-scrolling:touch]
          "
        >
          {detailLoading ? (
            <div
              className="
                flex
                min-h-[320px]
                items-center
                justify-center
              "
            >
              <LoadingSpinner />
            </div>
          ) : selectedItem ? (
            <div className="space-y-6">
              {/* ==================================================
                  SUMMARY
              =================================================== */}

              <div
                className="
                  grid
                  grid-cols-1
                  gap-3

                  sm:grid-cols-2
                "
              >
                <div
                  className="
                    rounded-lg
                    border
                    border-primary/15
                    bg-primary/[0.04]
                    p-4
                  "
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total Amount
                  </p>

                  <p
                    className="
                      mt-1
                      text-2xl
                      font-semibold
                      tracking-tight
                      text-primary
                    "
                  >
                    ₱
                    {safeCurrency(
                      selectedItem.grandTotal,
                    )}
                  </p>
                </div>

                <div
                  className="
                    rounded-lg
                    border
                    border-border
                    bg-muted/20
                    p-4

                    sm:text-right
                  "
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Created
                  </p>

                  <p className="mt-1 font-medium text-foreground">
                    {safeDate(
                      selectedItem.createdAt,
                    )}
                  </p>
                </div>
              </div>

              {/* ==================================================
                  SERVICES
              =================================================== */}

              {serviceIds.length >
                0 && (
                <DetailSection
                  icon={
                    Tag
                  }
                  title="Services"
                  action={
                    isEditable ? (
                      <span className="text-xs text-muted-foreground">
                        Included services
                      </span>
                    ) : undefined
                  }
                >
                  <div className="space-y-2">
                    {serviceIds.map(
                      (
                        serviceId,
                      ) => (
                        <ServiceCard
                          key={
                            serviceId
                          }
                          serviceId={
                            serviceId
                          }
                        />
                      ),
                    )}
                  </div>

                  <SubtotalRow
                    label="Service Subtotal"
                    amount={
                      selectedItem.serviceSubtotal
                    }
                  />
                </DetailSection>
              )}

              {/* ==================================================
                  FINDINGS
              =================================================== */}

              {findings.length >
                0 && (
                <DetailSection
                  icon={
                    FileText
                  }
                  title="Findings"
                >
                  <div className="space-y-2">
                    {findings.map(
                      (
                        finding: any,
                      ) => {
                        const parts =
                          getFindingParts(
                            finding,
                          );

                        const findingSubtotal =
                          getFindingSubtotal(
                            finding,
                          );

                        return (
                          <div
                            key={
                              finding.id
                            }
                            className={cn(
                              'rounded-lg border p-3',
                              finding.included !==
                                false
                                ? 'bg-card'
                                : 'bg-muted/30 opacity-60',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 whitespace-pre-wrap text-sm font-medium text-foreground">
                                {
                                  finding.description
                                }
                              </p>

                              <span className="shrink-0 text-xs font-semibold text-foreground">
                                ₱
                                {safeCurrency(
                                  findingSubtotal,
                                )}
                              </span>
                            </div>

                            {parts.length >
                              0 && (
                              <div className="mt-3 space-y-1">
                                {parts.map(
                                  (
                                    part: any,
                                    index: number,
                                  ) => {
                                    const quantity =
                                      Math.max(
                                        1,
                                        toSafeNumber(
                                          part?.quantity,
                                        ) ||
                                          1,
                                      );

                                    const unitPrice =
                                      Math.max(
                                        0,
                                        toSafeNumber(
                                          part?.priceAtTime ??
                                            part?.price,
                                        ),
                                      );

                                    const totalPrice =
                                      toSafeNumber(
                                        part?.totalPrice,
                                      ) ||
                                      unitPrice *
                                        quantity;

                                    return (
                                      <div
                                        key={
                                          part?.id ??
                                          `${finding.id}-part-${index}`
                                        }
                                        className="
                                          flex
                                          items-center
                                          justify-between
                                          gap-2
                                          rounded-md
                                          border
                                          border-border/60
                                          bg-muted/20
                                          px-3
                                          py-2
                                        "
                                      >
                                        <span className="min-w-0 text-xs text-foreground">
                                          {
                                            quantity
                                          }
                                          x{' '}
                                          {
                                            part?.partName ||
                                            part?.name ||
                                            part?.productName ||
                                            'Part'
                                          }

                                          {!part?.isPms &&
                                            ` (₱${safeCurrency(
                                              unitPrice,
                                            )} each)`}

                                          {part?.isPms &&
                                            ' (PMS)'}
                                        </span>

                                        <div className="flex shrink-0 items-center gap-1">
                                          <span className="text-xs font-semibold text-foreground">
                                            ₱
                                            {safeCurrency(
                                              totalPrice,
                                            )}
                                          </span>

                                          {isFinalBillEditable && (
                                            <>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                aria-label="Edit part"
                                                className="
                                                  h-8
                                                  w-8
                                                  rounded-md
                                                  text-muted-foreground
                                                  hover:text-foreground
                                                  focus-visible:outline-none
                                                  focus-visible:ring-2
                                                  focus-visible:ring-ring
                                                  focus-visible:ring-offset-2
                                                "
                                                onClick={() =>
                                                  onEditPart(
                                                    part,
                                                    finding.id,
                                                    selectedItem.id,
                                                  )
                                                }
                                              >
                                                <Pencil className="h-3.5 w-3.5" />
                                              </Button>

                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                aria-label="Remove part"
                                                className="
                                                  h-8
                                                  w-8
                                                  rounded-md
                                                  text-destructive
                                                  hover:bg-destructive/10
                                                  hover:text-destructive
                                                  focus-visible:outline-none
                                                  focus-visible:ring-2
                                                  focus-visible:ring-destructive/40
                                                  focus-visible:ring-offset-2
                                                "
                                                onClick={() =>
                                                  onDeletePart(
                                                    part,
                                                    finding.id,
                                                    selectedItem.id,
                                                  )
                                                }
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>

                  <SubtotalRow
                    label="Findings Subtotal"
                    amount={
                      selectedItem.findingsSubtotal
                    }
                  />
                </DetailSection>
              )}

              {/* ==================================================
                  INSPECTION TASKS
              =================================================== */}

              {detailType ===
                'estimate' &&
                inspectionTasks.length >
                  0 && (
                  <DetailSection
                    icon={
                      Wrench
                    }
                    title="Completed Inspection Tasks"
                  >
                    <div className="space-y-2">
                      {inspectionTasks.map(
                        (
                          task: any,
                          index: number,
                        ) => (
                          <TaskRow
                            key={
                              task?.id ??
                              `inspection-task-${index}`
                            }
                            title={
                              task?.title ||
                              'Inspection Task'
                            }
                            duration={
                              task?.durationMinutes
                                ? `${task.durationMinutes} min`
                                : undefined
                            }
                          />
                        ),
                      )}
                    </div>
                  </DetailSection>
                )}

              {/* ==================================================
                  WORK TASKS
              =================================================== */}

              {detailType ===
                'final-bill' &&
                workTasks.length >
                  0 && (
                  <DetailSection
                    icon={
                      Wrench
                    }
                    title="Completed Work Tasks"
                  >
                    <div className="space-y-2">
                      {workTasks.map(
                        (
                          task: any,
                          index: number,
                        ) => (
                          <TaskRow
                            key={
                              task?.id ??
                              `work-task-${index}`
                            }
                            title={
                              task?.title ||
                              task?.name ||
                              'Work Task'
                            }
                          />
                        ),
                      )}
                    </div>

                    <SubtotalRow
                      label="Work Tasks Subtotal"
                      amount={
                        selectedItem.workTasksSubtotal
                      }
                    />
                  </DetailSection>
                )}

              {/* ==================================================
                  FEES
              =================================================== */}

              <DetailSection
                icon={
                  PlusCircle
                }
                title="Fees"
                action={
                  isEditable ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setFeeModalOpen(
                          true,
                        )
                      }
                      className="
                        h-9
                        rounded-md
                        px-3
                        text-xs

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                      "
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Fee
                    </Button>
                  ) : undefined
                }
              >
                {fees.length >
                0 ? (
                  <div className="space-y-2">
                    {fees.map(
                      (
                        fee: any,
                        index: number,
                      ) => (
                        <div
                          key={
                            fee?.id ??
                            `fee-${index}`
                          }
                          className="
                            flex
                            items-center
                            justify-between
                            gap-3
                            rounded-lg
                            border
                            border-border
                            bg-muted/20
                            px-3
                            py-2.5
                          "
                        >
                          <span className="min-w-0 text-sm font-medium text-foreground">
                            {
                              fee?.title ||
                              'Fee'
                            }
                          </span>

                          <div className="flex shrink-0 items-center gap-1">
                            <span className="text-sm font-semibold text-foreground">
                              ₱
                              {safeCurrency(
                                fee?.amount,
                              )}
                            </span>

                            {isFinalBillEditable && (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Edit fee"
                                  className="h-8 w-8 rounded-md"
                                  onClick={() =>
                                    onEditFee(fee)
                                  }
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Remove fee"
                                  className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() =>
                                    onDeleteFee(fee)
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <EmptyLine text="No fees added." />
                )}

                <SubtotalRow
                  label="Fees Total"
                  amount={
                    selectedItem.feesTotal
                  }
                />
              </DetailSection>

              {/* ==================================================
                  DISCOUNTS
              =================================================== */}

              <DetailSection
                icon={
                  Percent
                }
                title="Discounts"
                action={
                  isEditable ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDiscountModalOpen(
                          true,
                        )
                      }
                      className="
                        h-9
                        rounded-md
                        px-3
                        text-xs

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                      "
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Discount
                    </Button>
                  ) : undefined
                }
              >
                {discounts.length >
                0 ? (
                  <div className="space-y-2">
                    {discounts.map(
                      (
                        discount: any,
                        index: number,
                      ) => (
                        <div
                          key={
                            discount?.id ??
                            `discount-${index}`
                          }
                          className="
                            flex
                            items-center
                            justify-between
                            gap-3
                            rounded-lg
                            border
                            border-border
                            bg-muted/20
                            px-3
                            py-2.5
                          "
                        >
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-foreground">
                              {
                                discount?.title ||
                                'Discount'
                              }
                            </span>

                            <span className="ml-2 text-xs text-muted-foreground">
                              (
                              {discount?.type ===
                              'fixed'
                                ? 'Fixed'
                                : 'Percentage'}
                              )
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <span className="text-sm font-semibold text-red-500">
                              -₱
                              {safeCurrency(
                                Math.abs(
                                  toSafeNumber(
                                    discount?.amount ??
                                      discount?.value,
                                  ),
                                ),
                              )}
                            </span>

                            {isFinalBillEditable && (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Edit discount"
                                  className="h-8 w-8 rounded-md"
                                  onClick={() =>
                                    onEditDiscount(discount)
                                  }
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Remove discount"
                                  className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() =>
                                    onDeleteDiscount(discount)
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <EmptyLine text="No discounts applied." />
                )}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-t
                    border-border
                    pt-3
                    text-sm
                    font-semibold
                  "
                >
                  <span>
                    Discount Total
                  </span>

                  <span className="text-red-500">
                    -₱
                    {safeCurrency(
                      Math.abs(
                        toSafeNumber(
                          selectedItem.discountTotal,
                        ),
                      ),
                    )}
                  </span>
                </div>
              </DetailSection>

              {/* ==================================================
                  GRAND TOTAL
              =================================================== */}

              <div
                className="
                  rounded-xl
                  border
                  border-primary/20
                  bg-primary/[0.045]
                  p-4

                  sm:p-5
                "
              >
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Grand Total
                    </p>

                    <p className="mt-1 text-lg font-semibold text-foreground">
                      Amount Due
                    </p>
                  </div>

                  <p
                    className="
                      text-2xl
                      font-semibold
                      tracking-tight
                      text-primary

                      sm:text-3xl
                    "
                  >
                    ₱
                    {safeCurrency(
                      selectedItem.grandTotal,
                    )}
                  </p>
                </div>
              </div>

              {/* ==================================================
                  REASON
              =================================================== */}

              {selectedItem.reason && (
                <div
                  className="
                    rounded-lg
                    border
                    border-yellow-200
                    bg-yellow-50
                    p-3
                  "
                >
                  <p className="text-xs font-medium text-yellow-700">
                    Reason:{' '}
                    {
                      selectedItem.reason
                    }
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              className="
                flex
                min-h-[280px]
                flex-col
                items-center
                justify-center
                text-center
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-full
                  bg-muted
                "
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>

              <p className="mt-4 text-sm font-semibold text-foreground">
                No details available
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                The final-bill information could not be displayed.
              </p>
            </div>
          )}
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <div
          className="
            shrink-0
            border-t
            border-border
            bg-background/80
            p-4
            backdrop-blur-xl
          "
        >
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(
                  false,
                )
              }
              className="
                h-11
                w-full
                rounded-md

                md:h-9
                md:w-auto

                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            >
              <Eye className="mr-2 h-4 w-4" />
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
   DETAIL SECTION
================================================================ */

function DetailSection({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ElementType;

  title: string;

  action?: React.ReactNode;

  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <h4
          className="
            flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-foreground
          "
        >
          <Icon className="h-4 w-4 text-primary" />

          {
            title
          }
        </h4>

        {
          action
        }
      </div>

      <div className="space-y-3">
        {
          children
        }
      </div>
    </section>
  );
}

/* ================================================================
   SUBTOTAL
================================================================ */

function SubtotalRow({
  label,
  amount,
}: {
  label: string;

  amount: unknown;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        border-t
        border-border
        pt-3
        text-sm
        font-semibold
      "
    >
      <span>
        {
          label
        }
      </span>

      <span className="shrink-0">
        ₱
        {safeCurrency(
          amount,
        )}
      </span>
    </div>
  );
}

/* ================================================================
   TASK ROW
================================================================ */

function TaskRow({
  title,
  duration,
}: {
  title: string;

  duration?: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-3
        rounded-lg
        border
        border-border
        bg-muted/20
        px-3
        py-2.5
      "
    >
      <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />

      <span
        className="
          min-w-0
          flex-1
          text-sm
          font-medium
          text-foreground
        "
      >
        {
          title
        }
      </span>

      {duration && (
        <span
          className="
            shrink-0
            text-xs
            text-muted-foreground
          "
        >
          {
            duration
          }
        </span>
      )}
    </div>
  );
}

/* ================================================================
   EMPTY LINE
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
        bg-muted/20
        px-3
        py-4
        text-center
        text-sm
        italic
        text-muted-foreground
      "
    >
      {
        text
      }
    </div>
  );
}
