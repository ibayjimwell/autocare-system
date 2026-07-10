// components/customers/customer-list.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    return sortDirection === "asc" ? <ArrowUp className="w-4 h-4 text-primary" /> : <ArrowDown className="w-4 h-4 text-primary" />;
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

  return (
    <>
      {/* Top Action Button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => { setEditingCustomer(null); setModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-6 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> Walk In
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
        <div className="relative w-full max-w-lg">
          <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", "text-muted-foreground")} />
          <Input placeholder="Search by name, email, or phone..." className="pl-10 rounded-2xl border-slate-200 focus:ring-primary/20 transition-all bg-white"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-slate-200 flex-1 md:flex-none">
                <Filter className="w-4 h-4 mr-2" /> Filters
                {(statusFilter !== "ALL" || dateFrom || dateTo) && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 rounded-2xl shadow-lg border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">Filter Customers</h4>
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs"><X className="w-3 h-3 mr-1" /> Reset</Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs font-bold text-slate-500">Created from</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 rounded-xl" /></div>
                  <div className="space-y-1"><Label className="text-xs font-bold text-slate-500">Created to</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 rounded-xl" /></div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setFilterOpen(false)}>Apply Filters</Button>
              </div>
            </PopoverContent>
          </Popover>
          <p className="hidden md:block text-sm font-medium text-muted-foreground whitespace-nowrap">
            Showing {currentData.length} of {filteredCustomers.length} records
          </p>
        </div>
      </div>

      {apiError && <div className="mb-4"><ErrorHandler type={apiError.type} title={apiError.title} message={apiError.message} /></div>}

      {loading ? <LoadingSpinner /> : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" description="Add your first customer to get started" />
      ) : (
        <div className="animate-in fade-in duration-700">
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {currentData.map(c => (
              <Card key={c.id} className="border-none shadow-md rounded-2xl bg-white overflow-hidden active:scale-[0.98] transition-transform">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold border border-slate-200">{c.fullname.charAt(0)}</div>
                      <div className="min-w-0">
                        <p className="font-bold text-lg text-slate-900 truncate">{c.fullname}</p>
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="flex items-center text-xs text-muted-foreground"><Mail className="w-3 h-3 mr-1" /> {c.email}</span>
                          <span className="flex items-center text-xs text-muted-foreground"><Phone className="w-3 h-3 mr-1" /> {c.phone}</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><CalendarDays className="w-3 h-3" /> {formatDate(c.createdAt)}</div>
                          {c.deactivated && <span className="text-xs font-bold text-destructive">Deactivated</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-50">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedCustomer(c)} className="rounded-lg font-bold"><Eye className="w-4 h-4 mr-2" /> View</Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingCustomer(c); setModalOpen(true); }} className="rounded-lg text-slate-600"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setStatusDialog({ open: true, id: c.id, name: c.fullname, action: c.deactivated ? 'reactivate' : 'deactivate' })}
                      className={cn("rounded-lg", c.deactivated ? "text-green-600 hover:bg-green-50" : "text-destructive hover:bg-destructive/10")}>
                      {c.deactivated ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="py-5 px-6 font-bold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("fullname")}><div className="flex items-center gap-2">Fullname <SortIcon field="fullname" /></div></TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("email")}><div className="flex items-center gap-2">Email <SortIcon field="email" /></div></TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("phone")}><div className="flex items-center gap-2">Phone <SortIcon field="phone" /></div></TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("createdAt")}><div className="flex items-center gap-2">Created <SortIcon field="createdAt" /></div></TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("updatedAt")}><div className="flex items-center gap-2">Updated <SortIcon field="updatedAt" /></div></TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("status")}><div className="flex items-center gap-2">Status <SortIcon field="status" /></div></TableHead>
                  <TableHead className="py-5 px-6 font-bold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map(c => (
                  <TableRow key={c.id} className="group border-slate-50 transition-colors hover:bg-slate-50/40">
                    <TableCell className="py-4 px-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold transition-colors group-hover:bg-primary group-hover:text-white">{c.fullname.charAt(0)}</div><span className="font-bold text-slate-800">{c.fullname}</span></div></TableCell>
                    <TableCell className="py-4 px-6"><div className="flex items-center text-slate-500"><Mail className="w-3.5 h-3.5 mr-2" />{c.email}</div></TableCell>
                    <TableCell className="py-4 px-6"><div className="flex items-center text-slate-500"><Phone className="w-3.5 h-3.5 mr-2" />{c.phone}</div></TableCell>
                    <TableCell className="py-4 px-6 text-sm text-slate-600">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="py-4 px-6 text-sm text-slate-600">{formatDate(c.updatedAt)}</TableCell>
                    <TableCell className="py-4 px-6">{c.deactivated ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">Deactivated</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">Active</span>}</TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(c)} className="rounded-lg hover:bg-primary/10 hover:text-primary"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingCustomer(c); setModalOpen(true); }} className="rounded-lg"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setStatusDialog({ open: true, id: c.id, name: c.fullname, action: c.deactivated ? 'reactivate' : 'deactivate' })}
                          className={cn("rounded-lg", c.deactivated ? "text-green-600 hover:bg-green-50" : "text-destructive hover:bg-destructive/10")}>
                          {c.deactivated ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
              <span className="text-sm text-muted-foreground font-medium">Page {currentPage} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 border-slate-200"><ChevronLeft className="w-4 h-4 mr-1" /> Previous</Button>
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <Button key={i} size="sm" variant={currentPage === i + 1 ? "default" : "ghost"} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl", currentPage === i + 1 ? "shadow-md" : "")}>{i + 1}</Button>
                  ))}
                </div>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 border-slate-200">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          </div>
        </div>
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