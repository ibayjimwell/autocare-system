import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/app-utils/payments/payments';
import { format } from 'date-fns';
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
  Tag,
  Wrench,
} from 'lucide-react';

import FeeModal from './FeeModal';
import DiscountModal from './DiscountModal';
import EditPartModal from './EditPartModal';

interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detailType: 'estimate' | 'final-bill';
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
    billId: string
  ) => void;
  feeModalOpen: boolean;
  setFeeModalOpen: (open: boolean) => void;
  feeForm: {
    title: string;
    amount: string;
    findingId: string;
  };
  setFeeForm: (form: {
    title: string;
    amount: string;
    findingId: string;
  }) => void;
  discountModalOpen: boolean;
  setDiscountModalOpen: (open: boolean) => void;
  discountForm: {
    title: string;
    type: string;
    value: string;
  };
  setDiscountForm: (form: {
    title: string;
    type: string;
    value: string;
  }) => void;
  editPartModalOpen: boolean;
  setEditPartModalOpen: (open: boolean) => void;
  editingPart: any;
  editPartForm: {
    quantity: number;
    priceAtTime: number;
  };
  setEditPartForm: (form: {
    quantity: number;
    priceAtTime: number;
  }) => void;
  submittingAdjustment: boolean;
  onSaveFee: () => void;
  onSaveDiscount: () => void;
  onSavePart: () => void;
}

export default function DetailModal({
  open,
  onOpenChange,
  detailType,
  selectedItem,
  detailLoading,
  onAddFee,
  onAddDiscount,
  onEditPart,
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
  if (!selectedItem && !detailLoading) return null;

  const isEditable =
    detailType === 'estimate' ||
    (detailType === 'final-bill' &&
      selectedItem?.status === 'PENDING');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-h-[92vh] w-[calc(100%-1rem)] overflow-y-auto
          rounded-xl border border-border bg-card p-0 shadow-2xl
          sm:max-w-4xl
          md:w-[calc(100%-2rem)]
        "
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background/80 p-4 backdrop-blur-xl sm:p-5">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-3 text-lg font-semibold sm:flex-row sm:items-center sm:justify-between md:text-xl">
              <span className="flex items-center gap-2">
                {detailType === 'estimate' ? (
                  <FileText className="h-5 w-5 text-primary" />
                ) : (
                  <ReceiptIcon />
                )}

                {detailType === 'estimate'
                  ? 'Estimate Details'
                  : 'Final Bill Details'}
              </span>

              {selectedItem && (
                <StatusBadge
                  status={selectedItem.status}
                  className="w-fit text-[10px]"
                />
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-5">
          {detailLoading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : selectedItem ? (
            <div className="space-y-6">
              {/* SUMMARY */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-primary/15 bg-primary/[0.04] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total Amount
                  </p>

                  <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                    ₱{formatCurrency(selectedItem.grandTotal)}
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Created
                  </p>

                  <p className="mt-1 font-medium">
                    {format(
                      new Date(selectedItem.createdAt),
                      'MMM dd, yyyy'
                    )}
                  </p>
                </div>
              </div>

              {/* SERVICES */}
              {selectedItem.appointment?.services &&
                selectedItem.appointment.services.length > 0 && (
                  <DetailSection
                    icon={Tag}
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
                      {selectedItem.appointment.services.map(
                        (service: any) => (
                          <ServiceCard
                            key={service.id}
                            serviceId={service.id}
                          />
                        )
                      )}
                    </div>

                    <SubtotalRow
                      label="Service Subtotal"
                      amount={selectedItem.serviceSubtotal}
                    />
                  </DetailSection>
                )}

              {/* FINDINGS */}
              {selectedItem.findings &&
                selectedItem.findings.length > 0 && (
                  <DetailSection
                    icon={FileText}
                    title="Findings"
                  >
                    <div className="space-y-2">
                      {selectedItem.findings.map((finding: any) => (
                        <div
                          key={finding.id}
                          className={cn(
                            'rounded-lg border p-3',
                            finding.included
                              ? 'bg-card'
                              : 'bg-muted/30 opacity-60'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium">
                              {finding.description}
                            </p>

                            <span className="shrink-0 text-xs font-semibold">
                              ₱{formatCurrency(
                                finding.partsSubtotal
                              )}
                            </span>
                          </div>

                          {finding.parts &&
                            finding.parts.length > 0 && (
                              <div className="mt-3 space-y-1">
                                {finding.parts.map(
                                  (part: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="
                                        flex items-center justify-between
                                        gap-2 rounded-md border border-border/60
                                        bg-muted/20 px-3 py-2
                                      "
                                    >
                                      <span className="min-w-0 text-xs">
                                        {part.quantity}x{' '}
                                        {part.partName || 'Part'}
                                        {!part.isPms &&
                                          ` (₱${formatCurrency(
                                            part.priceAtTime
                                          )} each)`}
                                        {part.isPms && ' (PMS)'}
                                      </span>

                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-semibold">
                                          ₱{formatCurrency(
                                            part.totalPrice
                                          )}
                                        </span>

                                        {detailType === 'final-bill' &&
                                          selectedItem?.status ===
                                            'PENDING' && (
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              aria-label="Edit part"
                                              className="
                                                h-8 w-8 rounded-md
                                                focus-visible:outline-none
                                                focus-visible:ring-2
                                                focus-visible:ring-ring
                                                focus-visible:ring-offset-2
                                              "
                                              onClick={() =>
                                                onEditPart(
                                                  part,
                                                  finding.id,
                                                  selectedItem.id
                                                )
                                              }
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                          )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>

                    <SubtotalRow
                      label="Findings Subtotal"
                      amount={selectedItem.findingsSubtotal}
                    />
                  </DetailSection>
                )}

              {/* INSPECTION TASKS */}
              {detailType === 'estimate' &&
                selectedItem.tasks &&
                selectedItem.tasks.length > 0 && (
                  <DetailSection
                    icon={Wrench}
                    title="Completed Inspection Tasks"
                  >
                    <div className="space-y-2">
                      {selectedItem.tasks.map((task: any) => (
                        <TaskRow
                          key={task.id}
                          title={task.title}
                          duration={
                            task.durationMinutes
                              ? `${task.durationMinutes} min`
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </DetailSection>
                )}

              {/* WORK TASKS */}
              {detailType === 'final-bill' &&
                selectedItem.workTasks &&
                selectedItem.workTasks.length > 0 && (
                  <DetailSection
                    icon={Wrench}
                    title="Completed Work Tasks"
                  >
                    <div className="space-y-2">
                      {selectedItem.workTasks.map((task: any) => (
                        <TaskRow
                          key={task.id}
                          title={task.title}
                        />
                      ))}
                    </div>

                    <SubtotalRow
                      label="Work Tasks Subtotal"
                      amount={selectedItem.workTasksSubtotal}
                    />
                  </DetailSection>
                )}

              {/* FEES */}
              <DetailSection
                icon={PlusCircle}
                title="Fees"
                action={
                  isEditable ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setFeeModalOpen(true)}
                      className="
                        h-9 rounded-md px-3 text-xs
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-ring focus-visible:ring-offset-2
                      "
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Fee
                    </Button>
                  ) : undefined
                }
              >
                {selectedItem.fees &&
                selectedItem.fees.length > 0 ? (
                  <div className="space-y-2">
                    {selectedItem.fees.map((fee: any) => (
                      <div
                        key={fee.id}
                        className="
                          flex items-center justify-between
                          rounded-lg border bg-muted/20 px-3 py-2.5
                        "
                      >
                        <span className="text-sm font-medium">
                          {fee.title}
                        </span>

                        <span className="text-sm font-semibold">
                          ₱{formatCurrency(fee.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyLine text="No fees added." />
                )}

                <SubtotalRow
                  label="Fees Total"
                  amount={selectedItem.feesTotal}
                />
              </DetailSection>

              {/* DISCOUNTS */}
              <DetailSection
                icon={Percent}
                title="Discounts"
                action={
                  isEditable ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDiscountModalOpen(true)}
                      className="
                        h-9 rounded-md px-3 text-xs
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-ring focus-visible:ring-offset-2
                      "
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Discount
                    </Button>
                  ) : undefined
                }
              >
                {selectedItem.discounts &&
                selectedItem.discounts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedItem.discounts.map(
                      (discount: any) => (
                        <div
                          key={discount.id}
                          className="
                            flex items-center justify-between gap-3
                            rounded-lg border bg-muted/20 px-3 py-2.5
                          "
                        >
                          <div>
                            <span className="text-sm font-medium">
                              {discount.title}
                            </span>

                            <span className="ml-2 text-xs text-muted-foreground">
                              (
                              {discount.type === 'fixed'
                                ? 'Fixed'
                                : 'Percentage'}
                              )
                            </span>
                          </div>

                          <span className="text-sm font-semibold text-red-500">
                            -₱{formatCurrency(discount.amount)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <EmptyLine text="No discounts applied." />
                )}

                <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
                  <span>Discount Total</span>
                  <span className="text-red-500">
                    -₱{formatCurrency(selectedItem.discountTotal)}
                  </span>
                </div>
              </DetailSection>

              {/* TOTAL */}
              <div className="rounded-xl border border-primary/20 bg-primary/[0.045] p-4 sm:p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Grand Total
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      Amount Due
                    </p>
                  </div>

                  <p className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                    ₱{formatCurrency(selectedItem.grandTotal)}
                  </p>
                </div>
              </div>

              {selectedItem.reason && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-xs font-medium text-yellow-700">
                    Reason: {selectedItem.reason}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No details available.
            </p>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background/80 p-4 backdrop-blur-xl">
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="
                h-11 w-full rounded-md md:h-9 md:w-auto
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2
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
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h4>

        {action}
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubtotalRow({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <div className="flex justify-between border-t pt-3 text-sm font-semibold">
      <span>{label}</span>
      <span>₱{formatCurrency(amount)}</span>
    </div>
  );
}

function TaskRow({
  title,
  duration,
}: {
  title: string;
  duration?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
      <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />

      <span className="min-w-0 flex-1 text-sm font-medium">
        {title}
      </span>

      {duration && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {duration}
        </span>
      )}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-sm italic text-muted-foreground">
      {text}
    </div>
  );
}

function ReceiptIcon() {
  return <ReceiptText className="h-5 w-5 text-primary" />;
}