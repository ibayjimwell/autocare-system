'use client';

import React, { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import ConfirmationDialog from "@/components/services/confirmation-dialog";
import { cn } from "@/lib/utils";
import { servicesApi } from "@/lib/services/services";
import { toast } from "sonner";

type SortField = "name" | "basePrice" | "durationMinutes" | "type" | "status";

export default function ServiceTypes() {
  // ==========================================================================
  // State
  // ==========================================================================
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("active"); // active, disabled, all
  const [typeFilter, setTypeFilter] = useState<string>("ALL"); // PMS, REPAIR, CHECKUP, ALL

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    durationMinutes: "",
    type: "REPAIR",
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

  // Filter popover
  const [filterOpen, setFilterOpen] = useState(false);

  // ==========================================================================
  // Data Loading (all services, filtering client-side)
  // ==========================================================================
  const load = async () => {
    setLoading(true);
    setApiError(null);
    try {
      // Fetch all services (no filter) – we filter client-side
      const res = await servicesApi.list();
      if (res.error) {
        setApiError({
          type: res.errorType || "fe",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Failed to load services.",
        });
        setTypes([]);
      } else {
        // Map estimatedDuration to durationMinutes for display
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
  }, []);

  // ==========================================================================
  // Filtering & Sorting & Searching
  // ==========================================================================
  const filteredTypes = useMemo(() => {
    let data = [...types];

    // Search (client-side)
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      data = data.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          (t.description || "").toLowerCase().includes(term) ||
          (t.type || "").toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter === "active") data = data.filter((t) => t.active);
    else if (statusFilter === "disabled") data = data.filter((t) => !t.active);

    // Type filter
    if (typeFilter !== "ALL") {
      data = data.filter((t) => t.type === typeFilter);
    }

    // Sorting
    data.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case "name":
          valA = (a.name || "").toLowerCase();
          valB = (b.name || "").toLowerCase();
          break;
        case "basePrice":
          valA = parseFloat(a.basePrice) || 0;
          valB = parseFloat(b.basePrice) || 0;
          break;
        case "durationMinutes":
          valA = a.durationMinutes || 0;
          valB = b.durationMinutes || 0;
          break;
        case "type":
          valA = (a.type || "").toLowerCase();
          valB = (b.type || "").toLowerCase();
          break;
        case "status":
          valA = a.active ? 0 : 1;
          valB = b.active ? 0 : 1;
          break;
        default:
          return 0;
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [types, searchQuery, statusFilter, typeFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredTypes.length / itemsPerPage);
  const paginatedData = filteredTypes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, sortField, sortDirection]);

  // ==========================================================================
  // Sorting helpers
  // ==========================================================================
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 text-primary" />
    ) : (
      <ArrowDown className="w-4 h-4 text-primary" />
    );
  };

  // ==========================================================================
  // Filter reset
  // ==========================================================================
  const resetFilters = () => {
    setStatusFilter("active");
    setTypeFilter("ALL");
    setSearchQuery("");
  };

  // ==========================================================================
  // Form Handlers
  // ==========================================================================
  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", basePrice: "", durationMinutes: "", type: "REPAIR" });
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
      type: st.type || "REPAIR",
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
      type: form.type, // send type
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

  const typeBadge = (type: string) => {
    const config: Record<string, string> = {
      PMS: "bg-emerald-100 text-emerald-800",
      REPAIR: "bg-primary/10 text-primary",
      CHECKUP: "bg-blue-100 text-blue-800",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config[type] || "bg-slate-100 text-slate-600"}`}>
        {type}
      </span>
    );
  };

  // ==========================================================================
  // Loading state
  // ==========================================================================
  if (loading && types.length === 0) return <LoadingSpinner />;

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
            onClick={() => setStatusFilter("active")}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
              statusFilter === "active"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("disabled")}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
              statusFilter === "disabled"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Disabled
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-2xl border-slate-200 focus:ring-primary/20 transition-all"
            />
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-slate-200 flex-none">
                <Filter className="w-4 h-4 mr-2" /> Type
                {typeFilter !== "ALL" && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 rounded-xl shadow-lg border-slate-200">
              <div className="space-y-1">
                <button
                  onClick={() => { setTypeFilter("ALL"); setFilterOpen(false); }}
                  className={cn("w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg", typeFilter === "ALL" && "bg-primary/5 text-primary")}
                >
                  All Types
                </button>
                {["PMS", "REPAIR", "CHECKUP"].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTypeFilter(t); setFilterOpen(false); }}
                    className={cn("w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg", typeFilter === t && "bg-primary/5 text-primary")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ===== Empty State ===== */}
      {filteredTypes.length === 0 ? (
        <EmptyState
          icon={Cog}
          title={`No ${statusFilter === "disabled" ? "disabled" : "active"} services found`}
          description={
            searchQuery || typeFilter !== "ALL"
              ? "Try adjusting your search or filters."
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
                      <div className="mt-1">{typeBadge(st.type)}</div>
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
                      {st.active ? (
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
                  <TableHead
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-8 cursor-pointer select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      Service Detail <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center gap-2">
                      Type <SortIcon field="type" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                    onClick={() => handleSort("basePrice")}
                  >
                    <div className="flex items-center gap-2">
                      Pricing <SortIcon field="basePrice" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                    onClick={() => handleSort("durationMinutes")}
                  >
                    <div className="flex items-center gap-2">
                      Duration <SortIcon field="durationMinutes" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      Status <SortIcon field="status" />
                    </div>
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
                    <TableCell>{typeBadge(st.type)}</TableCell>
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
                    <TableCell>
                      {st.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          Disabled
                        </span>
                      )}
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
                        {st.active ? (
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
              Service Type
            </Label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm({ ...form, type: value })}
            >
              <SelectTrigger className="rounded-xl border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REPAIR">Repair</SelectItem>
                <SelectItem value="PMS">PMS</SelectItem>
                <SelectItem value="CHECKUP">Checkup</SelectItem>
              </SelectContent>
            </Select>
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