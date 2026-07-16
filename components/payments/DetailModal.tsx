// components/payments/DetailModal.tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/app-utils/payments/payments';
import { format } from 'date-fns';
import StatusBadge from '@/components/shared/status-badge';
import LoadingSpinner from '@/components/shared/loading-spinner';
import ServiceCard from '@/components/services/service-card';
import { FileText, PlusCircle, Percent, Wrench, CheckCircle, Pencil, Plus, Eye, Tag } from 'lucide-react';
import { useState } from 'react';

// We'll import specific adjustment modals separately, but for brevity they are defined in the same file or can be referenced as children.
import FeeModal from './FeeModal';
import DiscountModal from './DiscountModal';
import EditPartModal from './EditPartModal';

interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detailType: 'estimate' | 'final-bill';
  selectedItem: any;
  detailLoading: boolean;
  onAddFee: (form: { title: string; amount: string; findingId: string }) => void;
  onAddDiscount: (form: { title: string; type: string; value: string }) => void;
  onEditPart: (part: any, findingId: string, billId: string) => void;
  feeModalOpen: boolean;
  setFeeModalOpen: (open: boolean) => void;
  feeForm: { title: string; amount: string; findingId: string };
  setFeeForm: (form: { title: string; amount: string; findingId: string }) => void;
  discountModalOpen: boolean;
  setDiscountModalOpen: (open: boolean) => void;
  discountForm: { title: string; type: string; value: string };
  setDiscountForm: (form: { title: string; type: string; value: string }) => void;
  editPartModalOpen: boolean;
  setEditPartModalOpen: (open: boolean) => void;
  editingPart: any;
  editPartForm: { quantity: number; priceAtTime: number };
  setEditPartForm: (form: { quantity: number; priceAtTime: number }) => void;
  submittingAdjustment: boolean;
  onSaveFee: () => void;
  onSaveDiscount: () => void;
  onSavePart: () => void;
}

export default function DetailModal({
  open, onOpenChange, detailType, selectedItem, detailLoading,
  onAddFee, onAddDiscount, onEditPart,
  feeModalOpen, setFeeModalOpen, feeForm, setFeeForm,
  discountModalOpen, setDiscountModalOpen, discountForm, setDiscountForm,
  editPartModalOpen, setEditPartModalOpen,
  editingPart, editPartForm, setEditPartForm,
  submittingAdjustment, onSaveFee, onSaveDiscount, onSavePart,
}: DetailModalProps) {
  if (!selectedItem && !detailLoading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            {detailType === 'estimate' ? 'Estimate Details' : 'Final Bill Details'}
            {selectedItem && <StatusBadge status={selectedItem.status} />}
          </DialogTitle>
        </DialogHeader>

        {detailLoading ? (
          <LoadingSpinner />
        ) : selectedItem ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-2xl">
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-black text-primary">₱{formatCurrency(selectedItem.grandTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-bold">{format(new Date(selectedItem.createdAt), 'MMM dd, yyyy')}</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Services */}
              {selectedItem.appointment?.services && selectedItem.appointment.services.length > 0 && (
                <>
                  <h4 className="font-bold flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Services</h4>
                  <div className="space-y-2">
                    {selectedItem.appointment.services.map((service: any) => (
                      <ServiceCard key={service.id} serviceId={service.id} />
                    ))}
                  </div>
                  <div className="flex justify-end mt-2 text-sm font-bold">Service Subtotal: ₱{formatCurrency(selectedItem.serviceSubtotal)}</div>
                  <Separator className="my-3" />
                </>
              )}

              {/* Findings */}
              {selectedItem.findings && selectedItem.findings.length > 0 && (
                <>
                  <h4 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Findings</h4>
                  <div className="space-y-3">
                    {selectedItem.findings.map((finding: any) => (
                      <div key={finding.id} className={cn('border rounded-xl p-3', finding.included ? 'bg-card' : 'opacity-60 bg-muted/30 line-through')}>
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium">{finding.description}</p>
                          <span className="text-xs font-bold text-muted-foreground">₱{formatCurrency(finding.partsSubtotal)}</span>
                        </div>
                        {finding.parts && finding.parts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {finding.parts.map((part: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between bg-muted/20 rounded-lg px-2 py-1">
                                <span className="text-[11px]">
                                  {part.quantity}x {part.partName || 'Part'}
                                  {!part.isPms && ` (₱${formatCurrency(part.priceAtTime)} each)`}
                                  {part.isPms && ' (PMS)'}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-bold">₱{formatCurrency(part.totalPrice)}</span>
                                  {selectedItem.status === 'PENDING' && detailType === 'final-bill' && (
                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={() => onEditPart(part, finding.id, selectedItem.id)}>
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2 text-sm font-bold">Findings Subtotal: ₱{formatCurrency(selectedItem.findingsSubtotal)}</div>
                  <Separator className="my-3" />
                </>
              )}

              {/* Work Tasks (Final Bills only) */}
              {detailType === 'final-bill' && selectedItem.workTasks && selectedItem.workTasks.length > 0 && (
                <>
                  <h4 className="font-bold flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Completed Work Tasks</h4>
                  <div className="space-y-2">
                    {selectedItem.workTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{task.title}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-2 text-sm font-bold">Work Tasks Subtotal: ₱{formatCurrency(selectedItem.workTasksSubtotal)}</div>
                  <Separator className="my-3" />
                </>
              )}

              {/* Fees */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold flex items-center gap-2"><PlusCircle className="w-4 h-4 text-primary" /> Fees</h4>
                  {detailType === 'estimate' && (
                    <Button size="sm" variant="outline" onClick={() => setFeeModalOpen(true)} className="h-8 text-xs font-bold"><Plus className="w-3 h-3 mr-1" /> Add Fee</Button>
                  )}
                </div>
                {selectedItem.fees && selectedItem.fees.length > 0 ? (
                  <div className="space-y-2">
                    {selectedItem.fees.map((fee: any) => (
                      <div key={fee.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                        <span className="text-sm font-medium">{fee.title}</span>
                        <span className="text-sm font-bold">₱{formatCurrency(fee.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">No fees added.</p>}
                <div className="flex justify-end mt-2 text-sm font-bold">Fees Total: ₱{formatCurrency(selectedItem.feesTotal)}</div>
                <Separator className="my-3" />
              </div>

              {/* Discounts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold flex items-center gap-2"><Percent className="w-4 h-4 text-primary" /> Discounts</h4>
                  {detailType === 'estimate' && (
                    <Button size="sm" variant="outline" onClick={() => setDiscountModalOpen(true)} className="h-8 text-xs font-bold"><Plus className="w-3 h-3 mr-1" /> Add Discount</Button>
                  )}
                </div>
                {selectedItem.discounts && selectedItem.discounts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedItem.discounts.map((discount: any) => (
                      <div key={discount.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                        <div>
                          <span className="text-sm font-medium">{discount.title}</span>
                          <span className="text-xs text-muted-foreground ml-2">({discount.type === 'fixed' ? 'Fixed' : 'Percentage'})</span>
                        </div>
                        <span className="text-sm font-bold text-red-500">-₱{formatCurrency(discount.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">No discounts applied.</p>}
                <div className="flex justify-end mt-2 text-sm font-bold">Discount Total: -₱{formatCurrency(selectedItem.discountTotal)}</div>
                <Separator className="my-3" />
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border border-primary/20">
                <span className="text-lg font-black">Grand Total</span>
                <span className="text-2xl font-black text-primary">₱{formatCurrency(selectedItem.grandTotal)}</span>
              </div>

              {selectedItem.reason && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-xs font-bold text-yellow-700">Reason: {selectedItem.reason}</p>
                </div>
              )}
            </div>
          </div>
        ) : <p className="text-center text-muted-foreground">No details available.</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}