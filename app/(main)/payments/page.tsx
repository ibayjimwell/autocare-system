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
  PlusCircle,
  Percent,
  Tag,
  Wrench,
  ListChecks,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// API imports
import { estimatesApi } from "@/lib/payments/estimates";
import { estimateAdjustmentsApi } from "@/lib/payments/estimates";
import { finalBillsApi } from "@/lib/payments/final-bills";
import { appointmentsApi } from "@/lib/appointments/appointments";
import ServiceCard from "@/components/services/service-card";

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
    services?: any[];
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
  appointment?: {
    id: string;
    appointmentDate: string;
    appointmentTime: string;
    customer: { fullname: string };
    vehicle: { plateNumber: string };
    services?: any[];
  };
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
  const [detailLoading, setDetailLoading] = useState(false);

  // Fee/Discount modals
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({ title: "", amount: "", findingId: "none" });
  const [discountForm, setDiscountForm] = useState({ title: "", type: "fixed", value: "" });
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Part edit modal
  const [editPartModalOpen, setEditPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editPartForm, setEditPartForm] = useState({ quantity: 1, priceAtTime: 0 });

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

  // Detail modal – now fetches full final bill with appointment and work tasks
  const openDetail = async (item: any, type: "estimate" | "final-bill") => {
    setDetailLoading(true);
    setSelectedItem(item);
    setDetailType(type);
    setDetailModalOpen(true);

    if (type === "final-bill") {
      try {
        const [billRes, apptRes] = await Promise.all([
          finalBillsApi.get(item.id),
          appointmentsApi.get(item.appointmentId),
        ]);
        if (billRes.error || !billRes.data) {
          toast.error(billRes.errorMessage || "Could not load full bill details.");
          setDetailLoading(false);
          return;
        }
        const bill = billRes.data;
        if (!apptRes.error && apptRes.data) {
          bill.appointment = {
            ...bill.appointment,
            customer: apptRes.data.customer,
            vehicle: apptRes.data.vehicle,
            services: apptRes.data.services || [],
          };
        }
        setSelectedItem(bill);
      } catch (err) {
        console.error("Failed to fetch final bill details", err);
        toast.error("Error loading bill details.");
      }
    } else {
      // Estimates – keep existing logic
      try {
        const [estRes, apptRes] = await Promise.all([
          estimatesApi.get(item.id),
          appointmentsApi.get(item.appointmentId),
        ]);
        if (!estRes.error) {
          const data = estRes.data;
          if (!apptRes.error && apptRes.data) {
            data.appointment.services = apptRes.data.services || [];
          }
          setSelectedItem(data);
        }
      } catch (err) {
        console.error("Failed to refresh estimate details", err);
      }
    }
    setDetailLoading(false);
  };

  // Fee/Discount handlers
  const handleAddFee = async () => {
    if (!feeForm.title.trim() || !feeForm.amount || parseFloat(feeForm.amount) <= 0) {
      toast.error("Please enter a title and a valid amount.");
      return;
    }
    setSubmittingAdjustment(true);
    try {
      const res = await estimateAdjustmentsApi.addFee(selectedItem.id, {
        title: feeForm.title.trim(),
        amount: parseFloat(feeForm.amount),
        findingId: feeForm.findingId === 'none' ? undefined : feeForm.findingId,
      });
      if (res.error) {
        toast.error(res.errorMessage || "Failed to add fee.");
      } else {
        toast.success("Fee added.");
        setFeeModalOpen(false);
        setFeeForm({ title: "", amount: "", findingId: "none" });
        const refreshed = await estimatesApi.get(selectedItem.id);
        if (!refreshed.error) setSelectedItem(refreshed.data);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Error adding fee.");
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const handleAddDiscount = async () => {
    if (!discountForm.title.trim() || !discountForm.value || parseFloat(discountForm.value) <= 0) {
      toast.error("Please enter a title and a valid value.");
      return;
    }
    setSubmittingAdjustment(true);
    try {
      const res = await estimateAdjustmentsApi.addDiscount(selectedItem.id, {
        title: discountForm.title.trim(),
        type: discountForm.type as 'fixed' | 'percentage',
        value: parseFloat(discountForm.value),
      });
      if (res.error) {
        toast.error(res.errorMessage || "Failed to add discount.");
      } else {
        toast.success("Discount added.");
        setDiscountModalOpen(false);
        setDiscountForm({ title: "", type: "fixed", value: "" });
        const refreshed = await estimatesApi.get(selectedItem.id);
        if (!refreshed.error) setSelectedItem(refreshed.data);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Error adding discount.");
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  // Part edit handlers
  const handleEditPartOpen = (part: any, findingId: string, billId: string) => {
    setEditingPart(part);
    setEditingFindingId(findingId);
    setEditingBillId(billId);
    setEditPartForm({ quantity: part.quantity, priceAtTime: parseFloat(part.priceAtTime) });
    setEditPartModalOpen(true);
  };

  const handleEditPartSave = async () => {
    if (!editingPart || !editingFindingId || !editingBillId) return;
    setSubmittingAdjustment(true);
    try {
      const res = await finalBillsApi.updatePart(
        editingBillId,
        editingFindingId,
        editingPart.id,
        editPartForm
      );
      if (res.error) {
        toast.error(res.errorMessage || "Failed to update part.");
      } else {
        toast.success("Part updated.");
        setEditPartModalOpen(false);
        const refreshed = await finalBillsApi.get(editingBillId);
        if (!refreshed.error) setSelectedItem(refreshed.data);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating part.");
    } finally {
      setSubmittingAdjustment(false);
    }
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

      {/* ===== Updated Detail Modal (Estimate & Final Bill) ===== */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              {detailType === "estimate" ? "Estimate Details" : "Final Bill Details"}
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
                  <p className="font-bold">{format(new Date(selectedItem.createdAt), "MMM dd, yyyy")}</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* ✅ Services Section */}
                {selectedItem.appointment?.services && selectedItem.appointment.services.length > 0 && (
                  <div>
                    <h4 className="font-bold flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-primary" /> Services
                    </h4>
                    <div className="space-y-2">
                      {selectedItem.appointment.services.map((service: any) => (
                        <ServiceCard key={service.id} serviceId={service.id} />
                      ))}
                    </div>
                    <div className="flex justify-end mt-2 text-sm font-bold">
                      <span>Service Subtotal: ₱{formatCurrency(selectedItem.serviceSubtotal)}</span>
                    </div>
                    <Separator className="my-3" />
                  </div>
                )}

                {/* Findings Section */}
                {selectedItem.findings && selectedItem.findings.length > 0 && (
                  <div>
                    <h4 className="font-bold flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-primary" /> Findings
                    </h4>
                    <div className="space-y-3">
                      {selectedItem.findings.map((finding: any) => (
                        <div
                          key={finding.id}
                          className={cn(
                            "border rounded-xl p-3 transition-all",
                            finding.included ? "bg-card" : "opacity-60 bg-muted/30 line-through"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium">{finding.description}</p>
                            <span className="text-xs font-bold text-muted-foreground">
                              ₱{formatCurrency(finding.partsSubtotal)}
                            </span>
                          </div>
                          {finding.parts && finding.parts.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {finding.parts.map((part: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-muted/20 rounded-lg px-2 py-1">
                                  <span className="text-[11px]">
                                    {part.quantity}x {part.partName || "Part"}
                                    {!part.isPms && ` (₱${formatCurrency(part.priceAtTime)} each)`}
                                    {part.isPms && " (PMS)"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-bold">₱{formatCurrency(part.totalPrice)}</span>
                                    {selectedItem.status === 'PENDING' && detailType === 'final-bill' && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-muted-foreground hover:text-primary"
                                        onClick={() => handleEditPartOpen(part, finding.id, selectedItem.id)}
                                      >
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
                    <div className="flex justify-end mt-2 text-sm font-bold">
                      <span>Findings Subtotal: ₱{formatCurrency(selectedItem.findingsSubtotal)}</span>
                    </div>
                    <Separator className="my-3" />
                  </div>
                )}

                {/* Work Tasks Section (Final Bills only) */}
                {detailType === "final-bill" && selectedItem.workTasks && selectedItem.workTasks.length > 0 && (
                  <div>
                    <h4 className="font-bold flex items-center gap-2 mb-3">
                      <Wrench className="w-4 h-4 text-primary" /> Completed Work Tasks
                    </h4>
                    <div className="space-y-2">
                      {selectedItem.workTasks.map((task: any) => (
                        <div key={task.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">{task.title}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end mt-2 text-sm font-bold">
                      <span>Work Tasks Subtotal: ₱{formatCurrency(selectedItem.workTasksSubtotal)}</span>
                    </div>
                    <Separator className="my-3" />
                  </div>
                )}

                {/* Fees Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-primary" /> Fees
                    </h4>
                    {detailType === "estimate" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFeeModalOpen(true)}
                        className="h-8 text-xs font-bold"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Fee
                      </Button>
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
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No fees added.</p>
                  )}
                  <div className="flex justify-end mt-2 text-sm font-bold">
                    <span>Fees Total: ₱{formatCurrency(selectedItem.feesTotal)}</span>
                  </div>
                  <Separator className="my-3" />
                </div>

                {/* Discounts Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold flex items-center gap-2">
                      <Percent className="w-4 h-4 text-primary" /> Discounts
                    </h4>
                    {detailType === "estimate" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDiscountModalOpen(true)}
                        className="h-8 text-xs font-bold"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Discount
                      </Button>
                    )}
                  </div>
                  {selectedItem.discounts && selectedItem.discounts.length > 0 ? (
                    <div className="space-y-2">
                      {selectedItem.discounts.map((discount: any) => (
                        <div key={discount.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                          <div>
                            <span className="text-sm font-medium">{discount.title}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({discount.type === 'fixed' ? 'Fixed' : 'Percentage'})
                            </span>
                          </div>
                          <span className="text-sm font-bold text-red-500">-₱{formatCurrency(discount.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No discounts applied.</p>
                  )}
                  <div className="flex justify-end mt-2 text-sm font-bold">
                    <span>Discount Total: -₱{formatCurrency(selectedItem.discountTotal)}</span>
                  </div>
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
          ) : (
            <p className="text-center text-muted-foreground">No details available.</p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Fee Modal ===== */}
      <Dialog open={feeModalOpen} onOpenChange={setFeeModalOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black">Add Fee</DialogTitle>
            <DialogDescription>Add a service fee or labor charge to the estimate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Title</Label>
              <Input
                value={feeForm.title}
                onChange={(e) => setFeeForm({ ...feeForm, title: e.target.value })}
                placeholder="e.g., Labor - Engine Work"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Amount (₱)</Label>
              <Input
                type="number"
                step="0.01"
                value={feeForm.amount}
                onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                placeholder="0.00"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Finding (Optional)</Label>
              <Select
                value={feeForm.findingId}
                onValueChange={(v) => setFeeForm({ ...feeForm, findingId: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select finding (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {selectedItem?.findings?.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setFeeModalOpen(false)} disabled={submittingAdjustment}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFee}
              disabled={submittingAdjustment}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
            >
              {submittingAdjustment ? "Adding..." : "Add Fee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Discount Modal ===== */}
      <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black">Add Discount</DialogTitle>
            <DialogDescription>Apply a discount to the estimate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Title</Label>
              <Input
                value={discountForm.title}
                onChange={(e) => setDiscountForm({ ...discountForm, title: e.target.value })}
                placeholder="e.g., Loyalty Discount"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Type</Label>
              <Select
                value={discountForm.type}
                onValueChange={(v) => setDiscountForm({ ...discountForm, type: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed (₱)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Value</Label>
              <Input
                type="number"
                step="0.01"
                value={discountForm.value}
                onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                placeholder={discountForm.type === 'fixed' ? '0.00' : '0'}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                {discountForm.type === 'fixed' ? 'Enter a fixed amount in ₱.' : 'Enter a percentage (e.g., 10 for 10%).'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDiscountModalOpen(false)} disabled={submittingAdjustment}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDiscount}
              disabled={submittingAdjustment}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
            >
              {submittingAdjustment ? "Adding..." : "Add Discount"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Edit Part Modal (Final Bill Findings) ===== */}
      <Dialog open={editPartModalOpen} onOpenChange={setEditPartModalOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black">Edit Part</DialogTitle>
            <DialogDescription>Change the quantity or unit price.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Part Name</Label>
              <p className="text-sm font-medium">{editingPart?.partName || "Part"}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantity</Label>
              <Input
                type="number"
                min="1"
                value={editPartForm.quantity}
                onChange={(e) => setEditPartForm({ ...editPartForm, quantity: parseInt(e.target.value) || 1 })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Price per unit (₱)</Label>
              <Input
                type="number"
                step="0.01"
                value={editPartForm.priceAtTime}
                onChange={(e) => setEditPartForm({ ...editPartForm, priceAtTime: parseFloat(e.target.value) || 0 })}
                className="rounded-xl"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Total: ₱{(editPartForm.quantity * editPartForm.priceAtTime).toFixed(2)}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditPartModalOpen(false)} disabled={submittingAdjustment}>
              Cancel
            </Button>
            <Button
              onClick={handleEditPartSave}
              disabled={submittingAdjustment}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
            >
              {submittingAdjustment ? "Saving..." : "Save Changes"}
            </Button>
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