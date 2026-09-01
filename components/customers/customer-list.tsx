'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Search,
  Users,
  Mail,
  Phone,
  Eye,
  Pencil,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Plus,
  SlidersHorizontal,
  Download,
  MoreHorizontal,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  const {
    customers,
    loading,
    apiError,
    loadCustomers,
    deactivateCustomer,
    reactivateCustomer,
  } = useCustomerData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    id: string | null;
    name: string;
    action: 'deactivate' | 'reactivate';
  }>({
    open: false,
    id: null,
    name: '',
    action: 'deactivate',
  });

  const [filterOpen, setFilterOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    let data = [...customers];

    if (search.trim()) {
      const term = search.toLowerCase();

      data = data.filter(
        (c) =>
          (c.fullname || '').toLowerCase().includes(term) ||
          (c.email || '').toLowerCase().includes(term) ||
          (c.phone || '').toLowerCase().includes(term)
      );
    }

    if (statusFilter === 'active') {
      data = data.filter((c) => !c.deactivated);
    } else if (statusFilter === 'deactivated') {
      data = data.filter((c) => c.deactivated);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      data = data.filter((c) => new Date(c.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      data = data.filter((c) => new Date(c.createdAt) <= to);
    }

    data.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortField) {
        case 'fullname':
          valA = (a.fullname || '').toLowerCase();
          valB = (b.fullname || '').toLowerCase();
          break;

        case 'email':
          valA = (a.email || '').toLowerCase();
          valB = (b.email || '').toLowerCase();
          break;

        case 'phone':
          valA = (a.phone || '').replace(/\D/g, '');
          valB = (b.phone || '').replace(/\D/g, '');
          break;

        case 'createdAt':
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          break;

        case 'updatedAt':
          valA = new Date(a.updatedAt).getTime();
          valB = new Date(b.updatedAt).getTime();
          break;

        case 'status':
          valA = a.deactivated ? 1 : 0;
          valB = b.deactivated ? 1 : 0;
          break;

        default:
          return 0;
      }

      if (valA < valB) {
        return sortDirection === 'asc' ? -1 : 1;
      }

      if (valA > valB) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      return 0;
    });

    return data;
  }, [
    customers,
    search,
    statusFilter,
    dateFrom,
    dateTo,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const currentData = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    dateFrom,
    dateTo,
    sortField,
    sortDirection,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/45" />
      );
    }

    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const resetFilters = () => {
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' || Boolean(dateFrom) || Boolean(dateTo);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';

    try {
      return format(new Date(dateStr), 'MMM dd, yyyy h:mm a');
    } catch {
      return '—';
    }
  };

  const handleStatusChange = async () => {
    const { id, action } = statusDialog;

    if (!id) return;

    try {
      if (action === 'deactivate') {
        await deactivateCustomer(id);
      } else {
        await reactivateCustomer(id);
      }

      toast.success(
        `Customer ${
          action === 'deactivate' ? 'deactivated' : 'reactivated'
        }.`
      );

      await loadCustomers();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} customer.`);
    } finally {
      setStatusDialog({
        open: false,
        id: null,
        name: '',
        action: 'deactivate',
      });
    }
  };

  if (selectedCustomer) {
    return (
      <CustomerDetail
        customer={selectedCustomer}
        onBack={() => {
          setSelectedCustomer(null);
          loadCustomers();
        }}
      />
    );
  }

  const StatusPill = ({ deactivated }: { deactivated: boolean }) => (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5',
        deactivated
          ? 'border-destructive/20 bg-destructive/10 text-destructive'
          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          deactivated ? 'bg-destructive' : 'bg-emerald-500'
        )}
      />
      {deactivated ? 'Deactivated' : 'Active'}
    </Badge>
  );

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      aria-sort={
        sortField === field
          ? sortDirection === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
      className="
        inline-flex items-center gap-1.5 rounded-md
        text-[11px] font-semibold uppercase tracking-wide
        text-muted-foreground transition-colors
        hover:text-foreground
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
        focus-visible:ring-offset-2
      "
    >
      {children}
      <SortIcon field={field} />
    </button>
  );

  return (
    <>
      {/* ============================================================
          HEADER / SUMMARY
          ============================================================ */}
      <div className="mb-5 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-4 md:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  Customer directory
                </h2>

                <Badge
                  variant="secondary"
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                >
                  {customers.length}
                </Badge>
              </div>

              <p className="mt-0.5 text-sm text-muted-foreground">
                Search, review, and manage customer profiles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
              <ShieldCheck className="h-4 w-4" />
              Customer records
            </div>

            <Button
              onClick={() => {
                setEditingCustomer(null);
                setModalOpen(true);
              }}
              className="
                h-11 w-full rounded-md px-4 text-base font-medium
                shadow-sm
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9 md:w-auto md:px-3 md:text-sm
              "
            >
              <Plus className="h-5 w-5 md:h-4 md:w-4" />
              Walk In
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================
          COMMAND / TOOLBAR
          ============================================================ */}
      <div className="mb-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 p-3 md:p-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="w-full lg:max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:h-4 md:w-4" />

              <Input
                placeholder="Search customers..."
                aria-label="Search customers"
                className="
                  h-11 rounded-md border-input bg-background
                  pl-11 text-base
                  shadow-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-1
                  md:h-9 md:pl-10 md:text-sm
                "
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  className="
                    absolute right-1.5 top-1/2 h-8 w-8
                    -translate-y-1/2 rounded-md
                    text-muted-foreground hover:text-foreground
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-1
                  "
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Desktop utilities */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="
                    h-11 shrink-0 rounded-md px-3
                    text-sm font-medium
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                    md:h-9
                  "
                >
                  <Filter className="h-4 w-4" />
                  Filters

                  {hasActiveFilters && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                sideOffset={8}
                className="
                  w-[calc(100vw-2rem)] max-w-sm rounded-lg
                  border-border bg-popover/95 p-4 shadow-xl
                  backdrop-blur-xl
                "
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Filter customers
                      </h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Refine the directory results.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="
                        h-8 rounded-md px-2 text-xs
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                      "
                    >
                      <X className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Status
                    </Label>

                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger
                        className="
                          h-11 rounded-md text-base
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                          md:h-9 md:text-sm
                        "
                      >
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent className="rounded-lg">
                        <SelectItem value="ALL">All customers</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="deactivated">
                          Deactivated
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="date-from"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Created from
                      </Label>

                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="
                          h-11 rounded-md text-base
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-1
                          md:h-9 md:text-sm
                        "
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="date-to"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Created to
                      </Label>

                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="
                          h-11 rounded-md text-base
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-1
                          md:h-9 md:text-sm
                        "
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setFilterOpen(false)}
                    className="
                      h-11 w-full rounded-md
                      text-sm font-medium
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-ring
                      focus-visible:ring-offset-2
                      md:h-9
                    "
                  >
                    Apply filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="outline"
              className="
                hidden h-9 shrink-0 rounded-md px-3 text-sm font-medium
                lg:inline-flex
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            >
              <SlidersHorizontal className="h-4 w-4" />
              Customize
            </Button>

            <Button
              type="button"
              variant="outline"
              className="
                hidden h-9 shrink-0 rounded-md px-3 text-sm font-medium
                lg:inline-flex
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            >
              <Download className="h-4 w-4" />
              Export
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="More customer actions"
              className="
                hidden h-9 w-9 shrink-0 rounded-md lg:inline-flex
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter summary */}
        {(hasActiveFilters || search) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/20 px-3 py-2 md:px-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Active filters
            </span>

            {search && (
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-1 text-[11px]"
              >
                Search: {search}
              </Badge>
            )}

            {statusFilter !== 'ALL' && (
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-1 text-[11px]"
              >
                Status:{' '}
                {statusFilter === 'active' ? 'Active' : 'Deactivated'}
              </Badge>
            )}

            {dateFrom && (
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-1 text-[11px]"
              >
                From: {dateFrom}
              </Badge>
            )}

            {dateTo && (
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-1 text-[11px]"
              >
                To: {dateTo}
              </Badge>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                resetFilters();
              }}
              className="
                h-7 rounded-md px-2 text-[11px]
                text-muted-foreground hover:text-foreground
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Error */}
      {apiError && (
        <div className="mb-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      {/* ============================================================
          CONTENT
          ============================================================ */}
      {loading ? (
        <LoadingSpinner />
      ) : customers.length === 0 ? (
        <Card className="rounded-xl border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title="No customers found"
              description="Add your first customer to get started"
            />
          </CardContent>
        </Card>
      ) : filteredCustomers.length === 0 ? (
        <Card className="rounded-xl border-border bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground/60" />
            </div>

            <h3 className="text-sm font-semibold text-foreground">
              No matching customers
            </h3>

            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try changing your search term or clearing one of the filters.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                resetFilters();
              }}
              className="
                mt-5 h-11 rounded-md px-4 text-sm font-medium
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9
              "
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="
            animate-in fade-in
            overflow-hidden rounded-xl
            border-border bg-card shadow-sm
            duration-500
          "
        >
          <CardContent className="p-0">
            {/* ========================================================
                MOBILE CUSTOMER LIST
                ======================================================== */}
            <div className="md:hidden">
              <div className="border-b border-border bg-muted/25 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Customers
                    </p>

                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {filteredCustomers.length} records
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className="rounded-full bg-background px-2.5 py-0.5 text-[11px]"
                  >
                    Page {currentPage} / {Math.max(totalPages, 1)}
                  </Badge>
                </div>
              </div>

              <ul className="divide-y divide-border">
                {currentData.map((c) => (
                  <li key={c.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                        {c.fullname?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold tracking-tight text-foreground">
                              {c.fullname}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Customer profile
                            </p>
                          </div>

                          <StatusPill deactivated={!!c.deactivated} />
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </span>

                          <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4 shrink-0" />
                            <span className="truncate">{c.phone}</span>
                          </span>

                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            Created {formatDate(c.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setSelectedCustomer(c)}
                        className="
                          h-11 flex-1 rounded-md px-4
                          text-sm font-medium
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                        "
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCustomer(c);
                          setModalOpen(true);
                        }}
                        aria-label={`Edit ${c.fullname}`}
                        className="
                          h-11 w-11 rounded-md
                          text-muted-foreground hover:text-foreground
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                        "
                      >
                        <Pencil className="h-5 w-5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setStatusDialog({
                            open: true,
                            id: c.id,
                            name: c.fullname,
                            action: c.deactivated
                              ? 'reactivate'
                              : 'deactivate',
                          })
                        }
                        aria-label={
                          c.deactivated
                            ? `Reactivate ${c.fullname}`
                            : `Deactivate ${c.fullname}`
                        }
                        className={cn(
                          'h-11 w-11 rounded-md',
                          c.deactivated
                            ? 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'
                            : 'text-destructive hover:bg-destructive/10',
                          'focus-visible:outline-none',
                          'focus-visible:ring-2',
                          'focus-visible:ring-ring',
                          'focus-visible:ring-offset-2'
                        )}
                      >
                        {c.deactivated ? (
                          <UserCheck className="h-5 w-5" />
                        ) : (
                          <UserX className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* ========================================================
                DESKTOP TABLE
                ======================================================== */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3 lg:px-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Customer records
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Showing {currentData.length} of {filteredCustomers.length}{' '}
                    matching records
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Sorted by</span>
                  <span className="font-medium text-foreground">
                    {sortField === 'fullname'
                      ? 'Full name'
                      : sortField === 'email'
                      ? 'Email'
                      : sortField === 'phone'
                      ? 'Phone'
                      : sortField === 'createdAt'
                      ? 'Created'
                      : sortField === 'updatedAt'
                      ? 'Updated'
                      : 'Status'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[1040px]">
                  <TableHeader>
                    <TableRow className="border-border bg-muted/35 hover:bg-muted/35">
                      <TableHead className="h-11 w-[235px] px-4 text-xs text-muted-foreground lg:px-5">
                        <SortableHeader field="fullname">
                          Full name
                        </SortableHeader>
                      </TableHead>

                      <TableHead className="h-11 w-[270px] px-4 text-xs text-muted-foreground lg:px-5">
                        <SortableHeader field="email">
                          Email
                        </SortableHeader>
                      </TableHead>

                      <TableHead className="h-11 w-[160px] px-4 text-xs text-muted-foreground lg:px-5">
                        <SortableHeader field="phone">
                          Phone
                        </SortableHeader>
                      </TableHead>

                      <TableHead className="h-11 w-[175px] px-4 text-xs text-muted-foreground lg:px-5">
                        <SortableHeader field="createdAt">
                          Created
                        </SortableHeader>
                      </TableHead>

                      <TableHead className="h-11 w-[175px] px-4 text-xs text-muted-foreground lg:px-5">
                        <SortableHeader field="updatedAt">
                          Updated
                        </SortableHeader>
                      </TableHead>

                      <TableHead className="h-11 w-[130px] px-4 text-xs text-muted-foreground lg:px-5">
                        <SortableHeader field="status">
                          Status
                        </SortableHeader>
                      </TableHead>

                      <TableHead className="h-11 w-[130px] px-4 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {currentData.map((c) => (
                      <TableRow
                        key={c.id}
                        className="
                          border-border
                          transition-colors
                          hover:bg-muted/20
                        "
                      >
                        <TableCell className="px-4 py-2.5 lg:px-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                              {c.fullname?.charAt(0)?.toUpperCase() || '?'}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[180px] truncate text-sm font-medium text-foreground">
                                {c.fullname}
                              </p>

                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Customer
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-2.5 lg:px-5">
                          <div className="flex min-w-0 items-center gap-2">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />

                            <span className="block max-w-[220px] truncate text-sm text-muted-foreground">
                              {c.email}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-2.5 lg:px-5">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />

                            <span className="block max-w-[130px] truncate text-sm text-muted-foreground">
                              {c.phone}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm text-muted-foreground lg:px-5">
                          <div className="flex flex-col">
                            <span>{formatDate(c.createdAt).split(',')[0]}</span>
                            <span className="text-[11px] text-muted-foreground/70">
                              {formatDate(c.createdAt).split(',')[1]}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm text-muted-foreground lg:px-5">
                          <div className="flex flex-col">
                            <span>{formatDate(c.updatedAt).split(',')[0]}</span>
                            <span className="text-[11px] text-muted-foreground/70">
                              {formatDate(c.updatedAt).split(',')[1]}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-2.5 lg:px-5">
                          <StatusPill deactivated={!!c.deactivated} />
                        </TableCell>

                        <TableCell className="px-4 py-2.5 lg:px-5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCustomer(c)}
                              aria-label={`View ${c.fullname}`}
                              className="
                                h-8 rounded-md px-2.5
                                text-xs font-medium
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                              "
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setEditingCustomer(c);
                                setModalOpen(true);
                              }}
                              aria-label={`Edit ${c.fullname}`}
                              className="
                                h-8 w-8 rounded-md
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                              "
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setStatusDialog({
                                  open: true,
                                  id: c.id,
                                  name: c.fullname,
                                  action: c.deactivated
                                    ? 'reactivate'
                                    : 'deactivate',
                                })
                              }
                              aria-label={
                                c.deactivated
                                  ? `Reactivate ${c.fullname}`
                                  : `Deactivate ${c.fullname}`
                              }
                              className={cn(
                                'h-8 w-8 rounded-md',
                                c.deactivated
                                  ? 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'
                                  : 'text-destructive hover:bg-destructive/10',
                                'focus-visible:outline-none',
                                'focus-visible:ring-2',
                                'focus-visible:ring-ring',
                                'focus-visible:ring-offset-2'
                              )}
                            >
                              {c.deactivated ? (
                                <UserCheck className="h-3.5 w-3.5" />
                              ) : (
                                <UserX className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ========================================================
                PAGINATION
                ======================================================== */}
            <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <p className="text-xs text-muted-foreground">
                  <span className="sm:hidden">
                    Page{' '}
                    <span className="font-semibold text-foreground">
                      {currentPage}
                    </span>{' '}
                    of {Math.max(totalPages, 1)}
                  </span>

                  <span className="hidden sm:inline">
                    Showing{' '}
                    <span className="font-semibold text-foreground">
                      {currentData.length}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-foreground">
                      {filteredCustomers.length}
                    </span>{' '}
                    records
                  </span>
                </p>

                <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />

                <p className="text-xs font-medium text-muted-foreground">
                  Page {currentPage} of {Math.max(totalPages, 1)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  aria-label="Previous page"
                  className="
                    h-9 w-9 rounded-md
                    disabled:pointer-events-none
                    disabled:opacity-50
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                  "
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="hidden items-center gap-1 md:flex">
                  {[
                    ...Array(Math.max(totalPages, 1)),
                  ].map((_, i) => {
                    const page = i + 1;

                    return (
                      <Button
                        type="button"
                        key={page}
                        size="icon"
                        variant={currentPage === page ? 'default' : 'ghost'}
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Go to page ${page}`}
                        aria-current={
                          currentPage === page ? 'page' : undefined
                        }
                        className="
                          h-8 w-8 rounded-md text-xs font-medium
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                        "
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={
                    totalPages === 0 || currentPage === totalPages
                  }
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(Math.max(totalPages, 1), p + 1)
                    )
                  }
                  aria-label="Next page"
                  className="
                    h-9 w-9 rounded-md
                    disabled:pointer-events-none
                    disabled:opacity-50
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                  "
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          CUSTOMER FORM
          ================================================================ */}
      <CustomerFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingCustomer={editingCustomer}
        onSuccess={() => {
          setModalOpen(false);
          loadCustomers();
        }}
      />

      {/* ================================================================
          STATUS CHANGE
          ================================================================ */}
      <StatusChangeDialog
        open={statusDialog.open}
        onOpenChange={(open) =>
          setStatusDialog({
            ...statusDialog,
            open,
          })
        }
        name={statusDialog.name}
        action={statusDialog.action}
        onConfirm={handleStatusChange}
      />
    </>
  );
}