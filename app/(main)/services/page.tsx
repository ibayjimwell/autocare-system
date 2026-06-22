import React, { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import DataModal from "@/components/shared/DataModal";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
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
  Trash2,
  PowerOff,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Tag,
  CheckCircle2,
} from "lucide-react";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { cn } from "@/lib/utils";

/**
 * ServiceTypes – Manage a catalog of service offerings.
 *
 * All API calls and business logic have been replaced with placeholders.
 * Backend team: replace each TODO comment with actual API invocations
 * (e.g., serviceTypesApi.list(), notify.success(), etc.).
 */
export default function ServiceTypes() {
  // ==========================================================================
  // UI State
  // ==========================================================================
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(true); // true = active, false = disabled
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    durationMinutes: "",
  });
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [deactivateDialog, setDeactivateDialog] = useState({
    open: false,
    id: null,
    name: "",
  });
  const [enableDialog, setEnableDialog] = useState({
    open: false,
    id: null,
    name: "",
  });
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState({
    open: false,
    id: null,
    name: "",
  });

  // ==========================================================================
  // Data Loading – Backend integration point
  // ==========================================================================
  const load = async () => {
    setLoading(true);
    // TODO: Backend – fetch service types based on activeFilter
    // const res = await serviceTypesApi.list(activeFilter);
    // const data = res.data?.data || res.data || [];
    // setTypes(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    setCurrentPage(1); // reset pagination on filter change
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

  // ==========================================================================
  // Form Handlers
  // ==========================================================================
  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", basePrice: "", durationMinutes: "" });
    setModalOpen(true);
  };

  const openEdit = (st) => {
    setEditing(st);
    setForm({
      name: st.name || "",
      description: st.description || "",
      basePrice: st.basePrice?.toString() || "",
      durationMinutes: st.durationMinutes?.toString() || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    // TODO: Backend – create or update service type
    // const data = { ...form, basePrice: parseFloat(form.basePrice) || 0, durationMinutes: parseInt(form.durationMinutes, 10) || 0 };
    // if (editing) {
    //   await serviceTypesApi.update(editing.id, data);
    //   notify.success('Service type updated');
    // } else {
    //   await serviceTypesApi.create(data);
    //   notify.success('Service type created');
    // }
    // setModalOpen(false);
    // load();
    setSaving(false);
  };

  // ==========================================================================
  // Action Handlers (deactivate, enable, permanent delete)
  // ==========================================================================
  const handleDeactivate = async () => {
    // TODO: Backend – deactivate service by ID
    // await serviceTypesApi.deactivate(deactivateDialog.id);
    // notify.success('Service deactivated');
    setDeactivateDialog({ open: false, id: null, name: "" });
    // load();
  };

  const handleEnable = async () => {
    // TODO: Backend – enable service by ID
    // await serviceTypesApi.enable(enableDialog.id);
    // notify.success(`"${enableDialog.name}" has been enabled`);
    setEnableDialog({ open: false, id: null, name: "" });
    // load();
  };

  const handlePermanentDelete = async () => {
    // TODO: Backend – permanently delete service by ID
    // await serviceTypesApi.permanentDelete(permanentDeleteDialog.id);
    // notify.success('Service permanently removed');
    setPermanentDeleteDialog({ open: false, id: null, name: "" });
    // load();
  };

  // ==========================================================================
  // Formatting Helper (UI only)
  // ==========================================================================
  const formatPrice = (price) => {
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
      {/* ===== Search & Filter Toolbar ===== */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        {/* Segmented control for active/disabled */}
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

        {/* Search field */}
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
                          <div className="flex items-center gap-1">
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
                          </div>
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
                {Array.from({ length: totalPages }).map((_, i) => (
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
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-2 pb-2 custom-scrollbar">
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
        variant="default"
      />

      <ConfirmationDialog
        open={enableDialog.open}
        onOpenChange={(open) => setEnableDialog({ ...enableDialog, open })}
        title="Enable Service"
        description={`Reactivate "${enableDialog.name}"? It will become available again in the customer booking portal.`}
        onConfirm={handleEnable}
        confirmText="Enable Service"
        variant="default"
      />

      <ConfirmationDialog
        open={permanentDeleteDialog.open}
        onOpenChange={(open) =>
          setPermanentDeleteDialog({ ...permanentDeleteDialog, open })
        }
        title="Permanent Removal"
        description={`Are you sure you want to delete "${permanentDeleteDialog.name}"? All associated history for this specific service type configuration will be lost.`}
        onConfirm={handlePermanentDelete}
        confirmText="Delete Permanently"
        variant="destructive"
      />
    </PageContainer>
  );
}