'use client';

import React from 'react';

import {
  Activity,
  AlertCircle,
  CalendarDays,
  Car,
  CheckCircle2,
  FileText,
  Loader2,
  ReceiptText,
  ShieldCheck,
  User,
  Wrench,
  X,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string | null;
  receipt: any;
  loading: boolean;
  error: string | null;
}

function formatCurrency(value: unknown): string {
  const num = Number.parseFloat(
    String(value ?? 0),
  );

  if (!Number.isFinite(num)) {
    return '0.00';
  }

  return num.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatDate(value: unknown): string {
  if (!value) {
    return '';
  }

  const date = new Date(
    String(value),
  );

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(
    'en-PH',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );
}

function formatTime(value: unknown): string {
  if (!value) {
    return '';
  }

  const date = new Date(
    String(value),
  );

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString(
    'en-PH',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

function getReceiptParts(receipt: any) {
  const details =
    receipt?.details ??
    receipt ??
    {};

  return {
    referenceNumber:
      receipt?.referenceNumber ??
      details?.referenceNumber ??
      '—',

    createdAt:
      receipt?.createdAt ??
      details?.createdAt ??
      null,

    customer:
      details?.customer ??
      null,

    vehicle:
      details?.vehicle ??
      null,

    appointment:
      details?.appointment ??
      null,

    services: Array.isArray(
      details?.services,
    )
      ? details.services
      : [],

    inspection:
      details?.inspection ??
      null,

    estimate:
      details?.estimate ??
      null,

    finalBill:
      details?.finalBill ??
      null,

    payment:
      details?.payment ??
      null,
  };
}

function getInspectionFindings(
  inspection: any,
  finalBill: any,
) {
  if (
    Array.isArray(
      inspection?.findings,
    )
  ) {
    return inspection.findings;
  }

  if (
    Array.isArray(
      finalBill?.findings,
    )
  ) {
    return finalBill.findings;
  }

  if (
    Array.isArray(
      finalBill?.estimate?.findings,
    )
  ) {
    return finalBill.estimate.findings;
  }

  return [];
}

function getParts(finding: any) {
  if (
    Array.isArray(
      finding?.parts,
    )
  ) {
    return finding.parts;
  }

  if (
    Array.isArray(
      finding?.findingParts,
    )
  ) {
    return finding.findingParts;
  }

  return [];
}

function getPartPrice(part: any): number {
  if (
    part?.totalPrice !== undefined &&
    part?.totalPrice !== null
  ) {
    return Number(part.totalPrice) || 0;
  }

  if (
    part?.lineTotal !== undefined &&
    part?.lineTotal !== null
  ) {
    return Number(part.lineTotal) || 0;
  }

  const quantity =
    Number(part?.quantity) || 1;

  const price =
    Number(part?.priceAtTime) ||
    Number(part?.unitPrice) ||
    0;

  return quantity * price;
}

function getFindingPartsSubtotal(
  finding: any,
  parts: any[],
): number {
  if (
    finding?.partsSubtotal !== undefined &&
    finding?.partsSubtotal !== null
  ) {
    return Number(
      finding.partsSubtotal,
    ) || 0;
  }

  return parts.reduce(
    (sum, part) =>
      sum +
      (part?.isPms
        ? 0
        : getPartPrice(part)),
    0,
  );
}

function getWorkTasks(finalBill: any) {
  if (
    Array.isArray(
      finalBill?.workTasks,
    )
  ) {
    return finalBill.workTasks;
  }

  return [];
}

function getInspectionFindingsFallback(
  finalBill: any,
) {
  return getInspectionFindings(
    null,
    finalBill,
  );
}

function getWorkTaskPrice(task: any): number {
  if (
    task?.price !== undefined &&
    task?.price !== null
  ) {
    return Number(task.price) || 0;
  }

  if (
    task?.amount !== undefined &&
    task?.amount !== null
  ) {
    return Number(task.amount) || 0;
  }

  if (
    task?.laborAmount !== undefined &&
    task?.laborAmount !== null
  ) {
    return Number(task.laborAmount) || 0;
  }

  if (
    task?.laborCost !== undefined &&
    task?.laborCost !== null
  ) {
    return Number(task.laborCost) || 0;
  }

  return 0;
}

function getReceiptServices(
  detailsServices: any[],
  finalBill: any,
) {
  if (detailsServices.length > 0) {
    return detailsServices;
  }

  if (
    Array.isArray(
      finalBill?.appointment?.services,
    )
  ) {
    return finalBill.appointment.services;
  }

  return [];
}

export default function ReceiptModal({
  open,
  onOpenChange,
  billId,
  receipt,
  loading,
  error,
}: ReceiptModalProps) {
  void billId;

  const {
    referenceNumber,
    createdAt,
    customer,
    vehicle,
    appointment,
    services: rawServices,
    inspection,
    finalBill,
    payment,
  } = getReceiptParts(
    receipt,
  );

  const services =
    getReceiptServices(
      rawServices,
      finalBill,
    );

  const findings =
    getInspectionFindings(
      inspection,
      finalBill,
    );

  const workTasks =
    getWorkTasks(
      finalBill,
    );

  const paidDate =
    payment?.paidAt
      ? formatDate(
          payment.paidAt,
        )
      : formatDate(
          createdAt,
        );

  const paidTime =
    payment?.paidAt
      ? formatTime(
          payment.paidAt,
        )
      : '';

  const totalService =
    Number(
      finalBill?.serviceSubtotal,
    ) || 0;

  const totalFindings =
    Number(
      finalBill?.findingsSubtotal,
    ) || 0;

  const totalWorkTasks =
    Number(
      finalBill?.workTasksSubtotal,
    ) || 0;

  const totalFees =
    Number(
      finalBill?.feesTotal,
    ) || 0;

  const totalDiscount =
    Number(
      finalBill?.discountTotal,
    ) || 0;

  const grandTotal =
    Number(
      finalBill?.grandTotal,
    ) ||
    totalService +
      totalFindings +
      totalWorkTasks +
      totalFees -
      totalDiscount;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          h-[calc(100dvh-1rem)]
          max-h-[calc(100dvh-1rem)]
          w-[calc(100vw-1rem)]
          max-w-[900px]
          overflow-hidden
          rounded-2xl
          border-border
          bg-muted/20
          p-0
          shadow-2xl
          sm:h-[92vh]
          sm:max-h-[92vh]
        "
      >
        <DialogTitle className="sr-only">
          AutoCare Official Receipt
        </DialogTitle>

        <DialogDescription className="sr-only">
          Official AutoCare receipt for the paid Final Cost.
        </DialogDescription>

        {/* ========================================================
            MODAL HEADER
        ========================================================= */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                Official Receipt
              </p>

              <p className="truncate text-[11px] text-muted-foreground">
                {referenceNumber !== '—'
                  ? referenceNumber
                  : 'Payment receipt'}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() =>
              onOpenChange(false)
            }
            aria-label="Close receipt"
            className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ========================================================
            RECEIPT SCROLL REGION
        ========================================================= */}
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-0 pb-6 pt-2">
          {loading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>

              <p className="mt-4 text-sm font-semibold text-foreground">
                Loading receipt
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                Retrieving the official receipt for this paid Final Cost.
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-7 w-7" />
              </div>

              <p className="mt-4 text-sm font-semibold text-foreground">
                Receipt unavailable
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                {error}
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onOpenChange(false)
                }
                className="mt-5 h-10 rounded-md"
              >
                Close
              </Button>
            </div>
          ) : receipt ? (
            <div className="px-2 sm:px-4 lg:px-6">
              {/* ==================================================
                  MOBILE RECEIPT PAPER — MATCHES MOBILE APP
              =================================================== */}
              <div
                className="
                  mx-auto
                  my-4
                  w-full
                  max-w-[680px]
                  border
                  border-border
                  bg-[#FFFEF9]
                  p-6
                  shadow-md
                  sm:my-6
                  sm:p-8
                "
              >
                {/* Header */}
                <div className="mb-6 text-center">
                  <p className="text-2xl font-black tracking-[4px] text-primary">
                    AUTO
                    <span className="text-foreground">
                      CARE
                    </span>
                  </p>

                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    by AutoProTech
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Official Receipt
                  </p>
                </div>

                {/* Dashed line */}
                <div className="mb-4 border-b border-dashed border-border" />

                {/* Receipt meta */}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">
                      Receipt #
                    </p>

                    <p className="break-all text-sm font-bold text-foreground">
                      {referenceNumber}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">
                      Date Paid
                    </p>

                    <p className="text-sm font-bold text-foreground">
                      {paidDate}{' '}
                      {paidTime}
                    </p>
                  </div>
                </div>

                {/* Customer & Vehicle */}
                {customer && (
                  <div className="mb-4 rounded-lg bg-muted/30 p-3">
                    <p className="mb-1 text-[10px] font-black uppercase text-muted-foreground">
                      Bill To
                    </p>

                    <p className="text-sm font-bold text-foreground">
                      {customer.fullname}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {customer.email ||
                        '—'}{' '}
                      |{' '}
                      {customer.phone ||
                        '—'}
                    </p>

                    {vehicle && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <Car className="h-3 w-3 shrink-0" />
                        <span>
                          {vehicle.make}{' '}
                          {vehicle.model}{' '}
                          ({vehicle.year}) • Plate:{' '}
                          {vehicle.plateNumber}
                        </span>
                      </div>
                    )}

                    {appointment && (
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span>
                          Appointment:{' '}
                          {appointment.trackingNumber}{' '}
                          –{' '}
                          {appointment.appointmentDate}{' '}
                          {appointment.appointmentTime}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Services */}
                {services.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">
                      Services
                    </p>

                    {services.map(
                      (service: any, index: number) => (
                        <div
                          key={
                            service?.id ||
                            index
                          }
                          className="flex items-center justify-between gap-4 py-1"
                        >
                          <p className="min-w-0 flex-1 text-sm text-foreground">
                            {service?.name ||
                              'Service'}
                          </p>

                          <p className="shrink-0 text-sm font-bold text-foreground">
                            ₱
                            {formatCurrency(
                              service?.basePrice,
                            )}
                          </p>
                        </div>
                      ),
                    )}

                    <div className="mt-1 flex items-center justify-between gap-4">
                      <p className="text-xs font-bold text-foreground">
                        Service Subtotal
                      </p>

                      <p className="text-xs font-bold text-foreground">
                        ₱
                        {formatCurrency(
                          totalService,
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Inspection Findings */}
                {findings.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">
                      Inspection Findings
                    </p>

                    {findings.map(
                      (
                        finding: any,
                        index: number,
                      ) => {
                        const parts =
                          getParts(
                            finding,
                          );

                        return (
                          <div
                            key={
                              finding?.id ||
                              index
                            }
                            className="mb-2"
                          >
                            <p className="text-xs font-bold text-foreground">
                              •{' '}
                              {finding?.description ||
                                'Finding'}
                            </p>

                            {parts.length >
                              0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {parts.map(
                                  (
                                    part: any,
                                    partIndex: number,
                                  ) => (
                                    <div
                                      key={
                                        part?.id ||
                                        partIndex
                                      }
                                      className="flex items-center justify-between gap-4 pl-4 py-0.5"
                                    >
                                      <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                                        {Number(
                                          part?.quantity,
                                        ) ||
                                          1}
                                        x{' '}
                                        {part?.partName ||
                                          'Part'}{' '}
                                        {part?.isPms
                                          ? '(PMS)'
                                          : ''}
                                      </p>

                                      <p className="shrink-0 text-xs font-bold text-foreground">
                                        ₱
                                        {formatCurrency(
                                          part?.isPms
                                            ? 0
                                            : getPartPrice(
                                                part,
                                              ),
                                        )}
                                      </p>
                                    </div>
                                  ),
                                )}

                                <div className="mt-0.5 flex items-center justify-between gap-4 pl-4">
                                  <p className="text-xs font-bold text-foreground">
                                    Finding Subtotal
                                  </p>

                                  <p className="text-xs font-bold text-foreground">
                                    ₱
                                    {formatCurrency(
                                      getFindingPartsSubtotal(
                                        finding,
                                        parts,
                                      ),
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}

                    <div className="mt-1 flex items-center justify-between gap-4">
                      <p className="text-xs font-bold text-foreground">
                        Findings Subtotal
                      </p>

                      <p className="text-xs font-bold text-foreground">
                        ₱
                        {formatCurrency(
                          totalFindings,
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Work Tasks */}
                {workTasks.length >
                  0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">
                      Completed Work Tasks
                    </p>

                    {workTasks.map(
                      (task: any, index: number) => (
                        <div
                          key={
                            task?.id ||
                            index
                          }
                          className="flex items-center justify-between gap-4 py-1"
                        >
                          <p className="min-w-0 flex-1 text-sm text-foreground">
                            {task?.title ||
                              'Work task'}
                          </p>

                          <p className="shrink-0 text-sm font-bold text-foreground">
                            {getWorkTaskPrice(
                              task,
                            ) > 0
                              ? `₱${formatCurrency(
                                  getWorkTaskPrice(
                                    task,
                                  ),
                                )}`
                              : '—'}
                          </p>
                        </div>
                      ),
                    )}

                    <div className="mt-1 flex items-center justify-between gap-4">
                      <p className="text-xs font-bold text-foreground">
                        Work Tasks Subtotal
                      </p>

                      <p className="text-xs font-bold text-foreground">
                        ₱
                        {formatCurrency(
                          totalWorkTasks,
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Fees */}
                {Array.isArray(
                  finalBill?.fees,
                ) &&
                  finalBill.fees.length >
                    0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">
                        Additional Fees
                      </p>

                      {finalBill.fees.map(
                        (fee: any, index: number) => (
                          <div
                            key={
                              fee?.id ||
                              index
                            }
                            className="flex items-center justify-between gap-4 py-1"
                          >
                            <p className="min-w-0 flex-1 text-sm text-foreground">
                              {fee?.title ||
                                'Fee'}
                            </p>

                            <p className="shrink-0 text-sm font-bold text-foreground">
                              ₱
                              {formatCurrency(
                                fee?.amount,
                              )}
                            </p>
                          </div>
                        ),
                      )}

                      <div className="mt-1 flex items-center justify-between gap-4">
                        <p className="text-xs font-bold text-foreground">
                          Fees Total
                        </p>

                        <p className="text-xs font-bold text-foreground">
                          ₱
                          {formatCurrency(
                            totalFees,
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Discounts */}
                {Array.isArray(
                  finalBill?.discounts,
                ) &&
                  finalBill.discounts.length >
                    0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">
                        Discounts
                      </p>

                      {finalBill.discounts.map(
                        (discount: any, index: number) => (
                          <div
                            key={
                              discount?.id ||
                              index
                            }
                            className="flex items-center justify-between gap-4 py-1"
                          >
                            <p className="min-w-0 flex-1 text-sm text-foreground">
                              {discount?.title ||
                                'Discount'}{' '}
                              (
                              {discount?.type ===
                              'fixed'
                                ? 'Fixed'
                                : 'Percentage'}
                              )
                            </p>

                            <p className="shrink-0 text-sm font-bold text-red-600">
                              −₱
                              {formatCurrency(
                                discount?.amount,
                              )}
                            </p>
                          </div>
                        ),
                      )}

                      <div className="mt-1 flex items-center justify-between gap-4">
                        <p className="text-xs font-bold text-foreground">
                          Discount Total
                        </p>

                        <p className="text-xs font-bold text-red-600">
                          −₱
                          {formatCurrency(
                            totalDiscount,
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Total */}
                <div className="mt-2 border-t border-dashed border-border pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xl font-black text-foreground">
                      TOTAL
                    </p>

                    <p className="text-xl font-black text-primary">
                      ₱
                      {formatCurrency(
                        grandTotal,
                      )}
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Amount Paid: ₱
                    {formatCurrency(
                      payment?.totalAmount ??
                        finalBill?.grandTotal,
                    )}
                  </p>

                  {payment?.paidAt && (
                    <p className="text-xs text-muted-foreground">
                      Paid on{' '}
                      {paidDate}{' '}
                      at{' '}
                      {paidTime}
                    </p>
                  )}
                </div>

                {/* Zigzag separator */}
                <div className="my-2 overflow-hidden text-center">
                  <p className="whitespace-nowrap text-xs leading-3 tracking-[2px] text-border">
                    {'▲▼'.repeat(19)}
                  </p>
                </div>

                {/* Thank you */}
                <div className="mt-4 text-center">
                  <ShieldCheck className="mx-auto h-5 w-5 text-primary" />

                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    Thank you for your business!
                  </p>

                  <p className="mt-1 text-[10px] text-muted-foreground">
                    This is an electronic receipt.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ReceiptText className="h-7 w-7" />
              </div>

              <p className="mt-4 text-sm font-semibold text-foreground">
                Receipt not found
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                No official receipt data is available for this paid Final Cost.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
