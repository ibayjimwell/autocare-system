'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  CheckCircle,
  DollarSign,
  Search,
  Car,
  User,
  Calendar,
  Receipt,
  FilterX,
  Eye,
  XCircle,
  Check,
} from "lucide-react";
import PageContainer from "@/components/shared/page-container";
import LoadingSpinner from "@/components/shared/loading-spinner";
import EmptyState from "@/components/shared/empty-state";
import StatusBadge from "@/components/shared/status-badge";
import ErrorHandler from "@/components/shared/error-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// API imports
import { estimatesApi } from "@/lib/payments/estimates";
import { finalBillsApi } from "@/lib/payments/final-bills";

// Types
interface Estimate {
  id: string;
  appointmentId: string;
  status: string;
  serviceSubtotal: string;
  findingsSubtotal: string;
  feesTotal: string;
  discountTotal: string;
  grandTotal: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  appointment: {
    id: string;
    appointmentDate: string;
    appointmentTime: string;
    customer: { fullname: string; email: string; phone: string };
    vehicle: { make: string; model: string; year: number; plateNumber: string };
  };
  findings?: any[];
  fees?: any[];
  discounts?: any[];
}

interface FinalBill {
  id: string;
  appointmentId: string;
  status: string;
  serviceSubtotal: string;
  findingsSubtotal: string;
  workTasksSubtotal: string;
  feesTotal: string;
  discountTotal: string;
  grandTotal: string;
  createdAt: string;
  updatedAt: string;
  findings?: any[];
  fees?: any[];
  discounts?: any[];
  workTasks?: any[];
}

export default function PaymentsPage() {
  const router = useRouter();

  // State
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [finalBills, setFinalBills] = useState<FinalBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"estimates" | "final-bills">("estimates");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [apiError, setApiError] = useState<{ type: string; title: string; message: string } | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    appointmentId: "",
    invoiceType: "ESTIMATE",
    status: "PENDING",
    totalAmount: "",
    details: "",
  });
  const [saving, setSaving] = useState(false);

  // Detail modal for viewing estimate/final bill
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<"estimate" | "final-bill">("estimate");

  // Fee/Discount modals
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({ title: "", amount: "", findingId: "" });
  const [discountForm, setDiscountForm] = useState({ title: "", type: "fixed", value: "" });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Loading data
  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const filter = statusFilter && statusFilter !== "ALL" ? { status: statusFilter } : {};
      const [estRes, billRes] = await Promise.all([
        estimatesApi.list(filter),
        finalBillsApi.list(filter),
      ]);
      if (estRes.error) {
        setApiError({
          type: estRes.errorType || "fe",
          title: estRes.errorTitle || "Error",
          message: estRes.errorMessage || "Failed to load estimates.",
        });
        setEstimates([]);
      } else {
        setEstimates(estRes.data || []);
      }
      if (billRes.error) {
        setApiError({
          type: billRes.errorType || "fe",
          title: billRes.errorTitle || "Error",
          message: billRes.errorMessage || "Failed to load final bills.",
        });
        setFinalBills([]);
      } else {
        setFinalBills(billRes.data || []);
      }
    } catch (err: any) {
      setApiError({
        type: "se",
        title: "Unexpected Error",
        message: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for estimates
  const handleSendForApproval = async (estimateId: string) => {
    try {
      const res = await estimatesApi.sendForApproval(estimateId);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to send for approval.");
      } else {
        toast.success("Estimate sent for approval.");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Error.");
    }
  };

  const handleApproveEstimate = async (estimateId: string) => {
    try {
      const res = await estimatesApi.approve(estimateId);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to approve estimate.");
      } else {
        toast.success("Estimate approved. Work can begin.");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Error.");
    }
  };

  const handleDeclineEstimate = async (estimateId: string, reason: string) => {
    if (!reason) {
      toast.error("Please provide a reason for declining.");
      return;
    }
    try {
      const res = await estimatesApi.decline(estimateId, reason);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to decline estimate.");
      } else {
        toast.success("Estimate declined.");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Error.");
    }
  };

  // Final bill actions
  const handleMarkPaid = async (billId: string) => {
    try {
      // We need an update method for final bills – we'll use a generic PUT
      const res = await fetch(`/api/payments/final-bills/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.errorMessage || "Failed to mark as paid.");
      } else {
        toast.success("Bill marked as paid.");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Error.");
    }
  };

  // Detail modal
  const openDetail = (item: any, type: "estimate" | "final-bill") => {
    setSelectedItem(item);
    setDetailType(type);
    setDetailModalOpen(true);
  };

  // Delete
  const confirmDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      if (activeTab === "estimates") {
        toast.info("Estimates cannot be deleted. You can decline them instead.");
      } else {
        const res = await finalBillsApi.delete(deleteTargetId);
        if (res.error) {
          toast.error(res.errorMessage || "Failed to delete.");
        } else {
          toast.success("Final bill deleted.");
          loadData();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error.");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const getStatusVariant = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s === "PENDING") return "secondary";
    if (s === "WAITING_FOR_APPROVAL") return "warning";
    if (s === "APPROVED") return "success";
    if (s === "DECLINED" || s === "CANCELLED") return "destructive";
    if (s === "PAID") return "default";
    return "secondary";
  };

  if (loading && estimates.length === 0 && finalBills.length === 0) return <LoadingSpinner />;

  return (
    <PageContainer
      title="Payments & Billing"
      subtitle="Manage estimates, approvals, and final billing"
      actions={
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ appointmentId: "", invoiceType: "ESTIMATE", status: "PENDING", totalAmount: "", details: "" });
            setModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-6 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> New Transaction
        </Button>
      }
    >
      {apiError && (
        <div className="mb-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 rounded-xl border-slate-200">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="WAITING_FOR_APPROVAL">Waiting Approval</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="DECLINED">Declined</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by plate or customer..." className="pl-10 rounded-xl" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-muted/30 p-1 rounded-2xl h-12 w-full sm:w-auto grid grid-cols-2">
          <TabsTrigger value="estimates" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">
            <Receipt className="w-4 h-4 mr-2" /> Estimates
          </TabsTrigger>
          <TabsTrigger value="final-bills" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">
            <DollarSign className="w-4 h-4 mr-2" /> Final Bills
          </TabsTrigger>
        </TabsList>

        {/* Estimates Tab */}
        <TabsContent value="estimates" className="mt-6">
          {estimates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No estimates"
              description={statusFilter !== "ALL" ? "No estimates with the selected status." : "Create an estimate from a confirmed appointment."}
            />
          ) : (
            <div className="space-y-4">
              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {estimates.map((est) => (
                  <Card key={est.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{est.appointment?.customer?.fullname || "Customer"}</p>
                          <p className="text-xs text-muted-foreground">{est.appointment?.vehicle?.plateNumber || "N/A"}</p>
                        </div>
                        <StatusBadge status={est.status} className="text-[10px]" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-lg font-black text-primary">₱{formatCurrency(est.grandTotal)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {est.status === "PENDING" && (
                          <Button size="sm" onClick={() => handleSendForApproval(est.id)} className="h-8 text-xs font-bold">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Send for Approval
                          </Button>
                        )}
                        {est.status === "WAITING_FOR_APPROVAL" && (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => handleApproveEstimate(est.id)} className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-bold">
                              <Check className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 text-xs font-bold" onClick={() => {
                              const reason = prompt("Reason for declining:");
                              if (reason) handleDeclineEstimate(est.id, reason);
                            }}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                            </Button>
                          </div>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openDetail(est, "estimate")} className="h-8 text-xs font-bold">
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <Card className="hidden md:block border-none shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer / Vehicle</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Total</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimates.map((est) => (
                      <TableRow key={est.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div>
                            <p className="font-bold">{est.appointment?.customer?.fullname || "Customer"}</p>
                            <p className="text-xs text-muted-foreground">{est.appointment?.vehicle?.plateNumber || "N/A"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {est.appointment?.appointmentDate ? format(new Date(est.appointment.appointmentDate), "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={est.status} className="text-[10px]" />
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">₱{formatCurrency(est.grandTotal)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {est.status === "PENDING" && (
                              <Button size="sm" variant="outline" onClick={() => handleSendForApproval(est.id)} className="h-8 text-xs font-bold">
                                <CheckCircle className="w-3.5 h-3.5" /> Send
                              </Button>
                            )}
                            {est.status === "WAITING_FOR_APPROVAL" && (
                              <>
                                <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-bold" onClick={() => handleApproveEstimate(est.id)}>
                                  <Check className="w-3.5 h-3.5 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" className="h-8 text-xs font-bold" onClick={() => {
                                  const reason = prompt("Reason for declining:");
                                  if (reason) handleDeclineEstimate(est.id, reason);
                                }}>
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => openDetail(est, "estimate")} className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Final Bills Tab */}
        <TabsContent value="final-bills" className="mt-6">
          {finalBills.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No final bills"
              description={statusFilter !== "ALL" ? "No final bills with the selected status." : "Final bills are generated from approved estimates."}
            />
          ) : (
            <div className="space-y-4">
              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {finalBills.map((bill) => (
                  <Card key={bill.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">Final Bill</p>
                          <p className="text-xs text-muted-foreground">#{bill.id.slice(0, 8)}</p>
                        </div>
                        <StatusBadge status={bill.status} className="text-[10px]" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-lg font-black text-primary">₱{formatCurrency(bill.grandTotal)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {bill.status !== "PAID" && (
                          <Button size="sm" onClick={() => handleMarkPaid(bill.id)} className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                            <DollarSign className="w-3.5 h-3.5 mr-1" /> Mark as Paid
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openDetail(bill, "final-bill")} className="h-8 text-xs font-bold">
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-red-500" onClick={() => confirmDelete(bill.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <Card className="hidden md:block border-none shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bill ID</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Total</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finalBills.map((bill) => (
                      <TableRow key={bill.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm">{bill.id.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell>
                          <StatusBadge status={bill.status} className="text-[10px]" />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(bill.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">₱{formatCurrency(bill.grandTotal)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {bill.status !== "PAID" && (
                              <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold" onClick={() => handleMarkPaid(bill.id)}>
                                <DollarSign className="w-3.5 h-3.5 mr-1" /> Pay
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => openDetail(bill, "final-bill")} className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => confirmDelete(bill.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Invoice Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editing ? "Edit Invoice" : "New Transaction"}</DialogTitle>
            <DialogDescription>Create a new invoice or estimate.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); setSaving(true); setTimeout(() => { setSaving(false); setModalOpen(false); toast.success("Invoice created (demo)"); }, 1000); }} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Appointment</Label>
              <Select value={form.appointmentId} onValueChange={(v) => setForm({ ...form, appointmentId: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select appointment..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="appt1">Appointment #1 - John Doe</SelectItem>
                  <SelectItem value="appt2">Appointment #2 - Jane Smith</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</Label>
                <Select value={form.invoiceType} onValueChange={(v) => setForm({ ...form, invoiceType: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESTIMATE">Estimate</SelectItem>
                    <SelectItem value="FINAL">Final Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="WAITING_FOR_APPROVAL">Waiting Approval</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (₱)</Label>
              <Input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} className="rounded-xl h-12 text-lg font-black" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Details / Notes</Label>
              <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className="rounded-xl resize-none" rows={3} placeholder="Service details..." />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
                {saving ? "Saving..." : "Save Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              {detailType === "estimate" ? "Estimate Details" : "Final Bill Details"}
              {selectedItem && <StatusBadge status={selectedItem.status} />}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedItem && (
              <>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-2xl">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-black text-primary">₱{formatCurrency(selectedItem.grandTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-bold">{format(new Date(selectedItem.createdAt), "MMM dd, yyyy")}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold">Breakdown</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Service Subtotal</span><span>₱{formatCurrency(selectedItem.serviceSubtotal)}</span></div>
                    {detailType === "estimate" && (
                      <div className="flex justify-between"><span>Findings Subtotal</span><span>₱{formatCurrency(selectedItem.findingsSubtotal)}</span></div>
                    )}
                    {detailType === "final-bill" && (
                      <div className="flex justify-between"><span>Work Tasks Subtotal</span><span>₱{formatCurrency(selectedItem.workTasksSubtotal)}</span></div>
                    )}
                    <div className="flex justify-between"><span>Fees Total</span><span>₱{formatCurrency(selectedItem.feesTotal)}</span></div>
                    <div className="flex justify-between text-red-500"><span>Discount Total</span><span>-₱{formatCurrency(selectedItem.discountTotal)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Grand Total</span><span>₱{formatCurrency(selectedItem.grandTotal)}</span></div>
                  </div>
                </div>
                {selectedItem.reason && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-xs font-bold text-yellow-700">Reason: {selectedItem.reason}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">Confirm Delete</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}