'use client';

import React, { useState, useEffect } from "react";
import PageContainer from "@/components/shared/page-container";
import DataModal from "@/components/shared/data-modal";
import EmptyState from "@/components/shared/empty-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import ErrorHandler from "@/components/shared/error-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Cog,
  Pencil,
  PowerOff,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Tag,
  CheckCircle2,
} from "lucide-react";
import ConfirmationDialog from "@/components/services/confirmation-dialog";
import { cn } from "@/lib/utils";
import { servicesApi } from "@/lib/services/services";
import { toast } from "sonner";

export default function ServiceTypes() {
  // ==========================================================================
  // State
  // ==========================================================================
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    durationMinutes: "",
  });
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  // Dialog states
  const [deactivateDialog, setDeactivateDialog] = useState({
    open: false,
    id: null as string | null,
    name: "",
  });
  const [enableDialog, setEnableDialog] = useState({
    open: false,
    id: null as string | null,
    name: "",
  });

  // ==========================================================================
  // Data Loading
  // ==========================================================================
  const load = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await servicesApi.list(activeFilter);
      if (res.error) {
        setApiError({
          type: res.errorType || "fe",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Failed to load services.",
        });
        setTypes([]);
      } else {
        // Map database column `estimatedDuration` to frontend `durationMinutes`
        const mappedData = (res.data || []).map((item: any) => ({
          ...item,
          durationMinutes: item.estimatedDuration,
        }));
        setTypes(mappedData);
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
  };

  useEffect(() => {
    load();
    setCurrentPage(1);
  }, [activeFilter]);

  // ==========================================================================
  // Filtering & Pagination
  // ==========================================================================
  const filteredTypes = types.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTypes.length / itemsPerPage);
  const paginatedData = filteredTypes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ==========================================================================
  // Form Handlers
  // ==========================================================================
  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", basePrice: "", durationMinutes: "" });
    setApiError(null);
    setModalOpen(true);
  };

  const openEdit = (st: any) => {
    setEditing(st);
    setForm({
      name: st.name || "",
      description: st.description || "",
      basePrice: st.basePrice?.toString() || "",
      durationMinutes: st.durationMinutes?.toString() || "",
    });
    setApiError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setApiError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      basePrice: form.basePrice ? parseFloat(form.basePrice) : undefined,
      durationMinutes: parseInt(form.durationMinutes, 10),
    };

    try {
      let res;
      if (editing) {
        res = await servicesApi.update(editing.id, payload);
      } else {
        res = await servicesApi.create(payload);
      }
      if (res.error) {
        setApiError({
          type: res.errorType || "fve",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Operation failed.",
        });
      } else {
        toast.success(editing ? "Service updated." : "Service created.");
        setModalOpen(false);
        await load();
      }
    } catch (err: any) {
      setApiError({
        type: "se",
        title: "Unexpected Error",
        message: err.message || "Something went wrong.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================================
  // Action Handlers (enable/disable)
  // ==========================================================================
  const handleDeactivate = async () => {
    if (!deactivateDialog.id) return;
    try {
      const res = await servicesApi.disable(deactivateDialog.id);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to disable service.");
      } else {
        toast.success(`"${deactivateDialog.name}" has been disabled.`);
        await load();
      }
    } catch (err: any) {
      toast.error(err.message || "Error disabling service.");
    } finally {
      setDeactivateDialog({ open: false, id: null, name: "" });
    }
  };

  const handleEnable = async () => {
    if (!enableDialog.id) return;
    try {
      const res = await servicesApi.enable(enableDialog.id);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to enable service.");
      } else {
        toast.success(`"${enableDialog.name}" has been enabled.`);
        await load();
      }
    } catch (err: any) {
      toast.error(err.message || "Error enabling service.");
    } finally {
      setEnableDialog({ open: false, id: null, name: "" });
    }
  };

  // ==========================================================================
  // Formatting Helper
  // ==========================================================================
  const formatPrice = (price: any) => {
    const num = parseFloat(price);
    return isNaN(num)
      ? "0.00"
      : num.toLocaleString("en-PH", { minimumFractionDigits: 2 });
  };

  // ==========================================================================
  // Loading state
  // ==========================================================================
  if (loading && types.length === 0) return <LoadingSpinner />;

  // ==========================================================================
  // Main Render
  // ==========================================================================
  return (
    <PageContainer
      title="Service Catalog"
      subtitle="Define and manage your professional service offerings"
      actions={
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl px-6 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Add Service Type</span>
          <span className="sm:hidden">Add</span>
        </Button>
      }
    >
      {/* ===== API Error Display ===== */}
      {apiError && (
        <div className="mb-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      {/* ===== Search & Filter Toolbar ===== */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        <div className="flex p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveFilter(true)}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
              activeFilter
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Active
          </button>
          <button
            onClick={() => setActiveFilter(false)}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
              !activeFilter
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Disabled
          </button>
        </div>

        <div className="relative w-full md:max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl border-slate-200 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* ===== Empty State ===== */}
      {filteredTypes.length === 0 ? (
        <EmptyState
          icon={Cog}
          title={`No ${activeFilter ? "active" : "disabled"} services found`}
          description={
            searchQuery
              ? "Try adjusting your search terms."
              : "Start by creating a new service category."
          }
        />
      ) : (
        <div className="space-y-4">
          {/* ===== Mobile View: Service Cards ===== */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedData.map((st) => (
              <Card
                key={st.id}
                className="rounded-2xl border-slate-100 overflow-hidden active:scale-[0.98] transition-transform"
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-800 truncate">
                        {st.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {st.description}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(st)}
                        className="h-8 w-8 rounded-lg text-slate-400"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {activeFilter ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeactivateDialog({
                              open: true,
                              id: st.id,
                              name: st.name,
                            })
                          }
                          className="h-8 w-8 rounded-lg text-orange-400"
                        >
                          <PowerOff className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setEnableDialog({
                              open: true,
                              id: st.id,
                              name: st.name,
                            })
                          }
                          className="h-8 w-8 rounded-lg text-green-400"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg">
                      <Tag className="w-3 h-3 text-primary" />
                      ₱{formatPrice(st.basePrice)}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg">
                      <Clock className="w-3 h-3 text-primary" />
                      {st.durationMinutes} min
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ===== Desktop View: Data Table ===== */}
          <Card className="hidden md:block rounded-[2rem] border-slate-100 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-8">
                    Service Detail
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Pricing
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Duration
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((st) => (
                  <TableRow
                    key={st.id}
                    className="group hover:bg-slate-50/50 transition-colors border-slate-50"
                  >
                    <TableCell className="py-4 pl-8">
                      <div>
                        <p className="font-black text-slate-800 text-sm">
                          {st.name}
                        </p>
                        <p className="text-xs text-slate-400 max-w-xs truncate">
                          {st.description || "No description provided"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/5 text-primary text-xs font-black">
                        ₱{formatPrice(st.basePrice)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        {st.durationMinutes} minutes
                      </div>
                    </TableCell>
                    <TableCell className="pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(st)}
                          className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {activeFilter ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeactivateDialog({
                                open: true,
                                id: st.id,
                                name: st.name,
                              })
                            }
                            className="h-9 w-9 rounded-xl hover:bg-orange-50 text-orange-400 transition-all"
                          >
                            <PowerOff className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setEnableDialog({
                                open: true,
                                id: st.id,
                                name: st.name,
                              })
                            }
                            className="h-9 w-9 rounded-xl hover:bg-green-50 text-green-500 transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* ===== Pagination Footer ===== */}
          <div className="flex items-center justify-between px-2 pt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Showing {paginatedData.length} of {filteredTypes.length} Services
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="h-8 rounded-xl border-slate-200 text-slate-600 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-8 h-8 rounded-xl text-[10px] font-black transition-all",
                      currentPage === i + 1
                        ? "bg-primary text-white"
                        : "text-slate-400 hover:bg-slate-100"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="h-8 rounded-xl border-slate-200 text-slate-600 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Create / Edit Modal ===== */}
      <DataModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? "Edit Service Details" : "New Service Type"}
        onSubmit={handleSave}
        isLoading={saving}
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-2 pb-2">
          {apiError && (
            <ErrorHandler
              type={apiError.type}
              title={apiError.title}
              message={apiError.message}
            />
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Service Name
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Executive Oil Change"
              className="rounded-xl border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Description
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Detail the inclusions of this service..."
              className="rounded-xl border-slate-200 min-h-[100px] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Base Price (₱)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={form.basePrice}
                onChange={(e) =>
                  setForm({ ...form, basePrice: e.target.value })
                }
                placeholder="0.00"
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Duration (Mins)
              </Label>
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: e.target.value })
                }
                placeholder="30"
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
        </div>
      </DataModal>

      {/* ===== Confirmation Dialogs ===== */}
      <ConfirmationDialog
        open={deactivateDialog.open}
        onOpenChange={(open) =>
          setDeactivateDialog({ ...deactivateDialog, open })
        }
        title="Confirm Deactivation"
        description={`This will hide "${deactivateDialog.name}" from the customer booking portal. You can reactivate it later.`}
        onConfirm={handleDeactivate}
        confirmText="Deactivate Service"
      />

      <ConfirmationDialog
        open={enableDialog.open}
        onOpenChange={(open) => setEnableDialog({ ...enableDialog, open })}
        title="Enable Service"
        description={`Reactivate "${enableDialog.name}"? It will become available again in the customer booking portal.`}
        onConfirm={handleEnable}
        confirmText="Enable Service"
      />
    </PageContainer>
  );
}