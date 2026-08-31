// components/customers/customer-list.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search, Users, Mail, Phone, Eye, Pencil, UserX, UserCheck,
  ChevronLeft, ChevronRight, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, CalendarDays, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerData, SortField } from '@/hooks/customers/useCustomerData';
import CustomerDetail from '@/components/customers/customer-detail';
import CustomerFormModal from './customer-form-modal';
import StatusChangeDialog from './status-change-dialog';
import EmptyState from '@/components/shared/empty-state';
import LoadingSpinner from '@/components/shared/loading-spinner';
import ErrorHandler from '@/components/shared/error-handler';
import { toast } from 'sonner';

interface CustomerListProps {}

export default function CustomerList({}: CustomerListProps) {
  const { customers, loading, apiError, loadCustomers, deactivateCustomer, reactivateCustomer } = useCustomerData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean; id: string | null; name: string; action: 'deactivate' | 'reactivate';
  }>({ open: false, id: null, name: "", action: 'deactivate' });
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter & Sort
  const filteredCustomers = useMemo(() => {
    let data = [...customers];
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(c =>
        (c.fullname || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        (c.phone || "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") data = data.filter(c => !c.deactivated);
    else if (statusFilter === "deactivated") data = data.filter(c => c.deactivated);
    if (dateFrom) { const from = new Date(dateFrom); data = data.filter(c => new Date(c.createdAt) >= from); }
    if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); data = data.filter(c => new Date(c.createdAt) <= to); }
    data.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case "fullname": valA = (a.fullname || "").toLowerCase(); valB = (b.fullname || "").toLowerCase(); break;
        case "email": valA = (a.email || "").toLowerCase(); valB = (b.email || "").toLowerCase(); break;
        case "phone": valA = (a.phone || "").replace(/\D/g, ""); valB = (b.phone || "").replace(/\D/g, ""); break;
        case "createdAt": valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); break;
        case "updatedAt": valA = new Date(a.updatedAt).getTime(); valB = new Date(b.updatedAt).getTime(); break;
        case "status": valA = a.deactivated ? 1 : 0; valB = b.deactivated ? 1 : 0; break;
        default: return 0;
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [customers, search, statusFilter, dateFrom, dateTo, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const currentData = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, dateFrom, dateTo, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
  };
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-foreground" /> : <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };
  const resetFilters = () => { setStatusFilter("ALL"); setDateFrom(""); setDateTo(""); };
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try { return format(new Date(dateStr), "MMM dd, yyyy h:mm a"); } catch { return "—"; }
  };

  const handleStatusChange = async () => {
    const { id, action } = statusDialog;
    if (!id) return;
    try {
      if (action === 'deactivate') await deactivateCustomer(id);
      else await reactivateCustomer(id);
      toast.success(`Customer ${action === 'deactivate' ? 'deactivated' : 'reactivated'}.`);
      await loadCustomers();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} customer.`);
    } finally {
      setStatusDialog({ open: false, id: null, name: "", action: 'deactivate' });
    }
  };

  if (selectedCustomer) {
    return <CustomerDetail customer={selectedCustomer} onBack={() => { setSelectedCustomer(null); loadCustomers(); }} />;
  }

  // ---- Shared status badge (image: always-visible status column chips) ----
  const StatusPill = ({ deactivated }: { deactivated: boolean }) => (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        deactivated
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      )}
    >
      {deactivated ? "Deactivated" : "Active"}
    </Badge>
  );

  return (
    <>
      {/* ================================================================
          TOOLBAR — mirrors the image: function buttons + search in a
          single bar above the table. Mobile: search first (iOS), then
          Walk In + Filters side by side at 44px. Desktop: buttons left,
          search right.
          ================================================================ */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Action buttons */}
        <div className="order-2 flex items-center gap-2 md:order-1">
          <Button
            onClick={() => { setEditingCustomer(null); setModalOpen(true); }}
            className="h-11 flex-1 rounded-md px-4 text-base font-medium shadow-sm md:h-9 md:flex-none md:px-3 md:text-sm"
          >
            <Plus className="h-5 w-5 md:h-4 md:w-4" /> Walk In
          </Button>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-md px-4 text-base font-medium md:h-9 md:flex-none md:px-3 md:text-sm"
              >
                <Filter className="h-5 w-5 md:h-4 md:w-4" /> Filters
                {(statusFilter !== "ALL" || dateFrom || dateTo) && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-popover/95 p-4 shadow-lg backdrop-blur-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Filter Customers</h4>
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 rounded-md text-xs font-medium">
                    <X className="h-3.5 w-3.5" /> Reset
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 rounded-md text-base md:h-9 md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Created from</Label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-11 rounded-md text-base md:h-9 md:text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Created to</Label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-11 rounded-md text-base md:h-9 md:text-sm" />
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="h-11 w-full rounded-md text-sm font-medium md:h-9" onClick={() => setFilterOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Search */}
        <div className="order-1 w-full md:order-2 md:w-72 lg:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:h-4 md:w-4" />
            <Input
              placeholder="Search by name, email, or phone..."
              className="h-11 rounded-md pl-11 text-base md:h-9 md:pl-10 md:text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {apiError && <div className="mb-4"><ErrorHandler type={apiError.type} title={apiError.title} message={apiError.message} /></div>}

      {loading ? <LoadingSpinner /> : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" description="Add your first customer to get started" />
      ) : (
        /* ================================================================
            DATA CARD — single white surface (image: one table card).
            Mobile: stacked rows. md+: data table. Shared footer with
            pagination for BOTH modes.
            ================================================================ */
        <Card className="animate-in fade-in overflow-hidden rounded-xl border-border bg-card shadow-sm duration-500">
          <CardContent className="p-0">
            {/* ---- Mobile rows (< md) ---- */}
            <ul className="divide-y divide-border md:hidden">
              {currentData.map(c => (
                <li key={c.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                      {c.fullname.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">{c.fullname}</p>
                        <StatusPill deactivated={!!c.deactivated} />
                      </div>
                      <div className="mt-2 space-y-1">
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </span>
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0" />
                          <span className="truncate">{c.phone}</span>
                        </span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedCustomer(c)}
                      className="h-11 flex-1 rounded-md px-4 text-sm font-medium"
                    >
                      <Eye className="h-4 w-4" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingCustomer(c); setModalOpen(true); }}
                      aria-label={`Edit ${c.fullname}`}
                      className="h-11 w-11 rounded-md text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStatusDialog({ open: true, id: c.id, name: c.fullname, action: c.deactivated ? 'reactivate' : 'deactivate' })}
                      aria-label={c.deactivated ? `Reactivate ${c.fullname}` : `Deactivate ${c.fullname}`}
                      className={cn(
                        "h-11 w-11 rounded-md",
                        c.deactivated
                          ? "text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                          : "text-destructive hover:bg-destructive/10",
                      )}
                    >
                      {c.deactivated ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* ---- Desktop table (md+) ---- */}
            <div className="hidden md:block">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      <button
                        onClick={() => handleSort("fullname")}
                        aria-sort={sortField === "fullname" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                        className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Fullname <SortIcon field="fullname" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      <button
                        onClick={() => handleSort("email")}
                        aria-sort={sortField === "email" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                        className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Email <SortIcon field="email" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      <button
                        onClick={() => handleSort("phone")}
                        aria-sort={sortField === "phone" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                        className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Phone <SortIcon field="phone" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      <button
                        onClick={() => handleSort("createdAt")}
                        aria-sort={sortField === "createdAt" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                        className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Created <SortIcon field="createdAt" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      <button
                        onClick={() => handleSort("updatedAt")}
                        aria-sort={sortField === "updatedAt" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                        className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Updated <SortIcon field="updatedAt" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      <button
                        onClick={() => handleSort("status")}
                        aria-sort={sortField === "status" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                        className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Status <SortIcon field="status" />
                      </button>
                    </TableHead>
                    <TableHead className="h-11 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-6">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map(c => (
                    <TableRow key={c.id} className="border-border transition-colors hover:bg-muted/30">
                      <TableCell className="px-4 py-3 md:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                            {c.fullname.charAt(0)}
                          </div>
                          <span className="max-w-[180px] truncate text-sm font-medium text-foreground">{c.fullname}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 md:px-6">
                        <span className="block max-w-[220px] truncate text-sm text-muted-foreground">{c.email}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 md:px-6">
                        <span className="block max-w-[140px] truncate text-sm text-muted-foreground">{c.phone}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground md:px-6">{formatDate(c.createdAt)}</TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground md:px-6">{formatDate(c.updatedAt)}</TableCell>
                      <TableCell className="px-4 py-3 md:px-6">
                        <StatusPill deactivated={!!c.deactivated} />
                      </TableCell>
                      <TableCell className="px-4 py-3 md:px-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedCustomer(c)}
                            aria-label={`View ${c.fullname}`}
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingCustomer(c); setModalOpen(true); }}
                            aria-label={`Edit ${c.fullname}`}
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setStatusDialog({ open: true, id: c.id, name: c.fullname, action: c.deactivated ? 'reactivate' : 'deactivate' })}
                            aria-label={c.deactivated ? `Reactivate ${c.fullname}` : `Deactivate ${c.fullname}`}
                            className={cn(
                              "h-8 w-8 rounded-md",
                              c.deactivated
                                ? "text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                                : "text-destructive hover:bg-destructive/10",
                            )}
                          >
                            {c.deactivated ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ---- Shared pagination footer (image: bottom of the card) ---- */}
            <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
              <p className="text-sm text-muted-foreground">
                <span className="md:hidden">
                  Page <span className="font-semibold text-foreground">{currentPage}</span> of {totalPages}
                </span>
                <span className="hidden md:inline">
                  Showing <span className="font-semibold text-foreground">{currentData.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{filteredCustomers.length}</span> records · Page {currentPage} of {totalPages}
                </span>
              </p>
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  aria-label="Previous page"
                  className="h-10 w-10 rounded-md"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="hidden items-center gap-1 md:flex">
                  {[...Array(totalPages)].map((_, i) => (
                    <Button
                      key={i}
                      size="icon"
                      variant={currentPage === i + 1 ? "default" : "ghost"}
                      onClick={() => setCurrentPage(i + 1)}
                      aria-label={`Go to page ${i + 1}`}
                      aria-current={currentPage === i + 1 ? "page" : undefined}
                      className="h-9 w-9 rounded-md text-sm font-medium"
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  aria-label="Next page"
                  className="h-10 w-10 rounded-md"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CustomerFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingCustomer={editingCustomer}
        onSuccess={() => { setModalOpen(false); loadCustomers(); }}
      />

      <StatusChangeDialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog({ ...statusDialog, open })}
        name={statusDialog.name}
        action={statusDialog.action}
        onConfirm={handleStatusChange}
      />
    </>
  );
}