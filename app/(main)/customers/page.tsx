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
  Search,
  Users,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  User,
  Lock,
  ShieldCheck,
  Filter,
  UserX,
  UserCheck,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { customersApi } from "@/lib/customers/customers";
import { toast } from "sonner";
// 👇 Import the CustomerDetail component
import CustomerDetail from "@/components/customers/customer-detail";

// Validation functions matching backend
const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
const validatePhone = (phone: string) => {
  return /^\+?[0-9]{7,15}$/.test(phone);
};
const validatePassword = (password: string) => {
  return password.length >= 6;
};

export default function Customers() {
  // ==========================================================================
  // State
  // ==========================================================================
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    id: string | null;
    name: string;
    action: 'deactivate' | 'reactivate';
  }>({
    open: false,
    id: null,
    name: "",
    action: 'deactivate',
  });
  const [formErrors, setFormErrors] = useState<{
    fullname?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [apiError, setApiError] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  // ==========================================================================
  // Data Loading
  // ==========================================================================
  const loadCustomers = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await customersApi.list(search || undefined);
      if (res.error) {
        setApiError({
          type: res.errorType || "fe",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Failed to load customers.",
        });
        setCustomers([]);
      } else {
        setCustomers(res.data || []);
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
    loadCustomers();
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ==========================================================================
  // Pagination
  // ==========================================================================
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const currentData = customers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ==========================================================================
  // Client-side validation helpers
  // ==========================================================================
  const validateForm = () => {
    const errors: any = {};
    if (!form.fullname.trim()) errors.fullname = "Full name is required.";
    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!validateEmail(form.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!form.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!validatePhone(form.phone.trim())) {
      errors.phone = "Phone must be 7-15 digits, optional leading +.";
    }
    // Only validate password for new customer
    if (!editingCustomer) {
      if (!form.password) {
        errors.password = "Password is required.";
      } else if (!validatePassword(form.password)) {
        errors.password = "Password must be at least 6 characters.";
      }
      if (form.password !== form.confirmPassword) {
        errors.confirmPassword = "Passwords do not match.";
      }
    } else {
      // For editing, password is optional and only validate if provided
      if (form.password && !validatePassword(form.password)) {
        errors.password = "Password must be at least 6 characters.";
      }
      if (form.password && form.password !== form.confirmPassword) {
        errors.confirmPassword = "Passwords do not match.";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==========================================================================
  // UI Handlers
  // ==========================================================================
  const openCreate = () => {
    setEditingCustomer(null);
    setForm({ fullname: "", email: "", phone: "", password: "", confirmPassword: "" });
    setFormErrors({});
    setApiError(null);
    setModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingCustomer(c);
    setForm({
      fullname: c.fullname || "",
      email: c.email || "",
      phone: c.phone || "",
      password: "",
      confirmPassword: "",
    });
    setFormErrors({});
    setApiError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setApiError(null);
    try {
      const payload = {
        fullname: form.fullname.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };
      let res;
      if (editingCustomer) {
        // Editing – only send fullname, email, phone (password is ignored)
        res = await customersApi.update(editingCustomer.id, payload);
      } else {
        // Creating – send password as well
        res = await customersApi.create({
          ...payload,
          password: form.password,
        });
      }
      if (res.error) {
        setApiError({
          type: res.errorType || "fve",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Operation failed.",
        });
      } else {
        toast.success(editingCustomer ? "Customer updated." : "Customer created.");
        setModalOpen(false);
        await loadCustomers();
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

  const openStatusDialog = (id: string, name: string, action: 'deactivate' | 'reactivate') => {
    setStatusDialog({ open: true, id, name, action });
  };

  const handleStatusChange = async () => {
    const { id, action } = statusDialog;
    if (!id) return;
    try {
      let res;
      if (action === 'deactivate') {
        res = await customersApi.deactivate(id);
      } else {
        res = await customersApi.reactivate(id);
      }
      if (res.error) {
        toast.error(res.errorMessage || `Failed to ${action} customer.`);
      } else {
        toast.success(`Customer ${action === 'deactivate' ? 'deactivated' : 'reactivated'} successfully.`);
        await loadCustomers();
      }
    } catch (err: any) {
      toast.error(err.message || `Error ${action}ing customer.`);
    } finally {
      setStatusDialog({ open: false, id: null, name: "", action: 'deactivate' });
    }
  };

  // ==========================================================================
  // Render: Customer Detail View (using the dedicated component)
  // ==========================================================================
  if (selectedCustomer) {
    return (
      <CustomerDetail
        customer={selectedCustomer}
        onBack={() => {
          setSelectedCustomer(null);
          // Reload the list to reflect any changes made in the detail view
          loadCustomers();
        }}
      />
    );
  }

  // ==========================================================================
  // Main render (list view)
  // ==========================================================================
  return (
    <PageContainer
      title="Customers"
      subtitle="Manage online or walk‑in customers"
      actions={
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-6 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> Walk In
        </Button>
      }
    >
      {/* ---------- Filter & Search Bar ---------- */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="relative w-full max-w-lg">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200">
            <Search
              className={cn(
                "w-5 h-5",
                focusField === "search" ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <Input
            placeholder="Search by name, email, or phone..."
            className="pl-10 rounded-2xl border-slate-200 focus:ring-primary/20 transition-all bg-white"
            value={search}
            onFocus={() => setFocusField("search")}
            onBlur={() => setFocusField(null)}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="border-slate-200 flex-1 md:flex-none">
            <Filter className="w-4 h-4 mr-2" /> Filters
          </Button>
          <p className="hidden md:block text-sm font-medium text-muted-foreground whitespace-nowrap">
            Showing {currentData.length} of {customers.length} records
          </p>
        </div>
      </div>

      {/* ---------- API Error Display ---------- */}
      {apiError && (
        <div className="mb-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      {/* ---------- Loading / Empty / Content ---------- */}
      {loading ? (
        <LoadingSpinner />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Add your first customer to get started"
        />
      ) : (
        <div className="animate-in fade-in duration-700">
          {/* ===== Mobile: Card Layout ===== */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {currentData.map((c) => (
              <Card
                key={c.id}
                className="border-none shadow-md rounded-2xl bg-white overflow-hidden active:scale-[0.98] transition-transform"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold border border-slate-200">
                        {c.fullname.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-lg text-slate-900 truncate">
                          {c.fullname}
                        </p>
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="flex items-center text-xs text-muted-foreground">
                            <Mail className="w-3 h-3 mr-1" /> {c.email}
                          </span>
                          <span className="flex items-center text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 mr-1" /> {c.phone}
                          </span>
                          {c.deactivated && (
                            <span className="text-xs font-bold text-destructive">Deactivated</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-50">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedCustomer(c)}
                      className="rounded-lg font-bold"
                    >
                      <Eye className="w-4 h-4 mr-2" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(c)}
                      className="rounded-lg text-slate-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        openStatusDialog(
                          c.id,
                          c.fullname,
                          c.deactivated ? 'reactivate' : 'deactivate'
                        )
                      }
                      className={cn(
                        "rounded-lg",
                        c.deactivated
                          ? "text-green-600 hover:bg-green-50"
                          : "text-destructive hover:bg-destructive/10"
                      )}
                    >
                      {c.deactivated ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ===== Desktop: Data Table ===== */}
          <div className="hidden md:block bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="py-5 px-6 font-bold text-slate-700">
                    Fullname
                  </TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700">
                    Email Address
                  </TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700">
                    Phone Number
                  </TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700">
                    Status
                  </TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((c) => (
                  <TableRow
                    key={c.id}
                    className="group border-slate-50 transition-colors hover:bg-slate-50/40"
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold transition-colors group-hover:bg-primary group-hover:text-white">
                          {c.fullname.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">
                          {c.fullname}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center text-slate-500">
                        <Mail className="w-3.5 h-3.5 mr-2" />
                        {c.email}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center text-slate-500">
                        <Phone className="w-3.5 h-3.5 mr-2" />
                        {c.phone}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {c.deactivated ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          Deactivated
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedCustomer(c)}
                          className="rounded-lg hover:bg-primary/10 hover:text-primary"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(c)}
                          className="rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            openStatusDialog(
                              c.id,
                              c.fullname,
                              c.deactivated ? 'reactivate' : 'deactivate'
                            )
                          }
                          className={cn(
                            "rounded-lg",
                            c.deactivated
                              ? "text-green-600 hover:bg-green-50"
                              : "text-destructive hover:bg-destructive/10"
                          )}
                        >
                          {c.deactivated ? (
                            <UserCheck className="w-4 h-4" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* ---------- Pagination Footer ---------- */}
            <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
              <span className="text-sm text-muted-foreground font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-xl h-10 border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={currentPage === i + 1 ? "default" : "ghost"}
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn(
                        "w-10 h-10 rounded-xl",
                        currentPage === i + 1 ? "shadow-md" : ""
                      )}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-xl h-10 border-slate-200"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Create / Edit Modal ===== */}
      <DataModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingCustomer ? "Update Profile" : "New Walk‑in Customer"}
        onSubmit={handleSave}
        isLoading={saving}
      >
        <div className="space-y-6 pt-4 px-2">
          {/* API errors inside modal */}
          {apiError && (
            <ErrorHandler
              type={apiError.type}
              title={apiError.title}
              message={apiError.message}
            />
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700">
              Full Name
            </Label>
            <div className="relative group">
              <User
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                  focusField === "name" ? "text-primary" : "text-slate-400"
                )}
              />
              <Input
                id="fullname"
                value={form.fullname}
                onFocus={() => setFocusField("name")}
                onBlur={() => setFocusField(null)}
                onChange={(e) => {
                  setForm({ ...form, fullname: e.target.value });
                  if (formErrors.fullname) setFormErrors({ ...formErrors, fullname: undefined });
                }}
                className={cn(
                  "pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white",
                  formErrors.fullname && "border-destructive focus:ring-destructive"
                )}
                placeholder="Ex: John Smith"
              />
            </div>
            {formErrors.fullname && (
              <p className="text-xs text-destructive">{formErrors.fullname}</p>
            )}
          </div>

          {/* Email & Phone grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">
                Email Address
              </Label>
              <div className="relative group">
                <Mail
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    focusField === "email" ? "text-primary" : "text-slate-400"
                  )}
                />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField(null)}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                  }}
                  className={cn(
                    "pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white",
                    formErrors.email && "border-destructive focus:ring-destructive"
                  )}
                  placeholder="name@email.com"
                />
              </div>
              {formErrors.email && (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">
                Phone Number
              </Label>
              <div className="relative group">
                <Phone
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    focusField === "phone" ? "text-primary" : "text-slate-400"
                  )}
                />
                <Input
                  id="phone"
                  value={form.phone}
                  onFocus={() => setFocusField("phone")}
                  onBlur={() => setFocusField(null)}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                  }}
                  className={cn(
                    "pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white",
                    formErrors.phone && "border-destructive focus:ring-destructive"
                  )}
                  placeholder="+63 9xx xxx xxxx"
                />
              </div>
              {formErrors.phone && (
                <p className="text-xs text-destructive">{formErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Separator – only show for new customer */}
          {!editingCustomer && (
            <>
              <div className="h-[1px] w-full bg-slate-100" />
              {/* Password Section – only for new customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock
                      className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                        focusField === "pass" ? "text-primary" : "text-slate-400"
                      )}
                    />
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onFocus={() => setFocusField("pass")}
                      onBlur={() => setFocusField(null)}
                      onChange={(e) => {
                        setForm({ ...form, password: e.target.value });
                        if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                      }}
                      className={cn(
                        "pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white",
                        formErrors.password && "border-destructive focus:ring-destructive"
                      )}
                      placeholder="••••••••"
                    />
                  </div>
                  {formErrors.password && (
                    <p className="text-xs text-destructive">{formErrors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700">
                    Confirm Password
                  </Label>
                  <div className="relative group">
                    <ShieldCheck
                      className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                        focusField === "confirm" ? "text-primary" : "text-slate-400"
                      )}
                    />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onFocus={() => setFocusField("confirm")}
                      onBlur={() => setFocusField(null)}
                      onChange={(e) => {
                        setForm({ ...form, confirmPassword: e.target.value });
                        if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: undefined });
                      }}
                      className={cn(
                        "pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white",
                        formErrors.confirmPassword && "border-destructive focus:ring-destructive"
                      )}
                      placeholder="••••••••"
                    />
                  </div>
                  {formErrors.confirmPassword && (
                    <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DataModal>

      {/* ===== Status Change Confirmation Dialog ===== */}
      <AlertDialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog({ ...statusDialog, open })}
      >
        <AlertDialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0",
              statusDialog.action === 'deactivate' ? "bg-destructive/10" : "bg-green-100"
            )}>
              {statusDialog.action === 'deactivate' ? (
                <UserX className="w-8 h-8 text-destructive" />
              ) : (
                <UserCheck className="w-8 h-8 text-green-600" />
              )}
            </div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">
              {statusDialog.action === 'deactivate' ? 'Deactivate' : 'Reactivate'} Customer
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600">
              {statusDialog.action === 'deactivate' ? (
                <>
                  You are about to deactivate <strong>{statusDialog.name}</strong>. This will prevent them from logging in. They can be reactivated later.
                </>
              ) : (
                <>
                  You are about to reactivate <strong>{statusDialog.name}</strong>. They will be able to log in again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-xl border-slate-200 font-bold px-6">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              className={cn(
                "h-12 rounded-xl font-bold px-6",
                statusDialog.action === 'deactivate'
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-green-600 text-white hover:bg-green-700"
              )}
            >
              Confirm {statusDialog.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}