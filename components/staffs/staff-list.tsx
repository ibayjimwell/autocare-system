'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus, UserCog, Pencil, Search, UserCircle2, ChevronLeft, ChevronRight,
  Filter, X, ArrowUpDown, ArrowUp, ArrowDown, LogOut, Key, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStaffData } from '@/hooks/staffs/useStaffData';
import { useStaffForm } from '@/hooks/staffs/useStaffForm';
import { MODULES, MODULE_LABELS, PREDEFINED_ROLES, SortField } from '@/app-utils/staffs/constants';
import DataModal from '@/components/shared/data-modal';
import ErrorHandler from '@/components/shared/error-handler';
import TempPasswordDialog from './temp-password-dialog';
import AccessModals from './access-modals';
import EmptyState from '@/components/shared/empty-state';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { toast } from 'sonner';
import { staffApi } from '@/lib/staffs/staffs';

export default function StaffList() {
  const { data: session } = useSession();
  const currentStaffId = session?.user?.id;

  const { staffList, loading, loadStaff } = useStaffData();

  // Filter & Sort state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('fullname');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterOpen, setFilterOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Highlight
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerHighlight = (id: string) => {
    setHighlightId(id);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightId(null), 2000);
  };

  // Access modals state
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [editAccessModalOpen, setEditAccessModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Use staff form hook
  const {
    modalOpen, setModalOpen, editingStaff, form, setForm, saving, formError,
    openCreate, openEdit, handleSave, handleFullNameChange,
    tempPassword, tempStaffName, tempStaffId, setTempPassword,
  } = useStaffForm(loadStaff, triggerHighlight);

  // Temp password dialog state
  const [tempDialogOpen, setTempDialogOpen] = useState(false);

  // When a new staff is created, open the temp password dialog and remember the staff ID
  useEffect(() => {
    if (tempPassword) {
      setTempDialogOpen(true);
      // Ensure we have the correct staff ID
      setSelectedStaffId(tempStaffId);
    }
  }, [tempPassword, tempStaffId]);

  // Outboard handler
  const handleOutboard = async (staff: any) => {
    if (!window.confirm(`Are you sure you want to outboard ${staff.fullname}?`)) return;
    try {
      const res = await staffApi.update(staff.id, { inBoarding: false });
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to outboard staff.');
      } else {
        toast.success(`${staff.fullname} has been outboarded.`);
        await loadStaff();
        triggerHighlight(staff.id);
      }
    } catch (err) {
      toast.error('Failed to outboard staff.');
    }
  };

  const handleEditAccess = (staffId: string) => {
    setSelectedStaffId(staffId);
    setEditAccessModalOpen(true);
  };

  const handleTempPasswordComplete = () => {
    setTempDialogOpen(false);
    setTempPassword(null);
    // Use the staff ID we already stored in state
    if (tempStaffId) {
      setSelectedStaffId(tempStaffId);
      setAccessModalOpen(true);
    } else {
      toast.error('Could not determine staff ID. Please assign access manually.');
    }
  };

  // Client-side filtering & sorting (also exclude current staff)
  const filteredAndSortedStaff = useMemo(() => {
    let data = [...staffList];
    if (currentStaffId) data = data.filter(s => s.id !== currentStaffId);

    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(s =>
        s.fullname?.toLowerCase().includes(term) ||
        s.username?.toLowerCase().includes(term) ||
        s.role?.toLowerCase().includes(term)
      );
    }
    if (roleFilter !== 'ALL') data = data.filter(s => s.role === roleFilter);
    if (statusFilter === 'online') data = data.filter(s => s.isOnline === true);
    else if (statusFilter === 'offline') data = data.filter(s => s.isOnline !== true && s.inBoarding !== false);
    else if (statusFilter === 'offboarded') data = data.filter(s => s.inBoarding === false);

    data.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'fullname': valA = (a.fullname || '').toLowerCase(); valB = (b.fullname || '').toLowerCase(); break;
        case 'username': valA = (a.username || '').toLowerCase(); valB = (b.username || '').toLowerCase(); break;
        case 'role': valA = (a.role || '').toLowerCase(); valB = (b.role || '').toLowerCase(); break;
        case 'status': valA = a.inBoarding === false ? 2 : (a.isOnline ? 0 : 1); valB = b.inBoarding === false ? 2 : (b.isOnline ? 0 : 1); break;
        case 'accessCount': valA = a.accessCount || 0; valB = b.accessCount || 0; break;
        case 'currentModule': valA = (a.currentModule || '').toLowerCase(); valB = (b.currentModule || '').toLowerCase(); break;
        default: return 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [staffList, search, roleFilter, statusFilter, sortField, sortDirection, currentStaffId]);

  const totalPages = Math.ceil(filteredAndSortedStaff.length / itemsPerPage);
  const paginatedStaff = filteredAndSortedStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useEffect(() => { setCurrentPage(1); }, [search, roleFilter, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-primary" /> : <ArrowDown className="w-4 h-4 text-primary" />;
  };
  const resetFilters = () => { setRoleFilter('ALL'); setStatusFilter('ALL'); };

  if (loading && staffList.length === 0) return <LoadingSpinner />;

  return (
    <>
      {/* Top Action Button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-6 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input placeholder="Search by name, role, or username..." className="pl-10 rounded-2xl border-slate-200 focus:ring-primary/20 transition-all bg-white"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
            <UserCircle2 className="w-3 h-3" />
            {filteredAndSortedStaff.length} Total Personnel
          </div>
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-slate-200">
                <Filter className="w-4 h-4 mr-2" /> Filters
                {(roleFilter !== 'ALL' || statusFilter !== 'ALL') && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-4 rounded-2xl shadow-lg border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">Filter Staff</h4>
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs"><X className="w-3 h-3 mr-1" /> Reset</Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Role</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Roles</SelectItem>
                      {PREDEFINED_ROLES.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="offboarded">Offboarded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setFilterOpen(false)}>Apply Filters</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedStaff.length === 0 ? (
        <EmptyState icon={UserCog} title="No staff members found"
          description={search || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'Try adjusting your search or filters.' : 'Your team directory is currently empty.'} />
      ) : (
        <div className="space-y-6">
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {paginatedStaff.map(staff => (
              <Card key={staff.id}
                className={cn('rounded-2xl border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform',
                  highlightId === staff.id && 'ring-2 ring-primary ring-offset-2 animate-pulse')}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">{staff.fullname?.charAt(0) || '?'}</div>
                        {staff.isOnline && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 leading-tight truncate">{staff.fullname}</p>
                        <p className="text-xs text-slate-400">@{staff.username}</p>
                        {staff.isOnline && staff.currentModule && (
                          <p className="text-[10px] text-primary font-semibold mt-0.5">
                            Viewing: {MODULE_LABELS[staff.currentModule] || staff.currentModule}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={cn('rounded-lg border-none px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter',
                      staff.inBoarding === false ? 'bg-yellow-100 text-yellow-700' : staff.isOnline ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500')}>
                      {staff.inBoarding === false ? 'Offboarded' : staff.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{staff.role}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(staff)} className="h-9 w-9 rounded-xl text-slate-400"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditAccess(staff.id)} className="h-9 w-9 rounded-xl text-slate-400"><Key className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOutboard(staff)} className="h-9 w-9 rounded-xl text-yellow-500"><LogOut className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none" onClick={() => handleSort('fullname')}><div className="flex items-center gap-2">Team Member <SortIcon field="fullname" /></div></TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none" onClick={() => handleSort('username')}><div className="flex items-center gap-2">Username <SortIcon field="username" /></div></TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none" onClick={() => handleSort('role')}><div className="flex items-center gap-2">Role & Access <SortIcon field="role" /></div></TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none" onClick={() => handleSort('status')}><div className="flex items-center gap-2">Status <SortIcon field="status" /></div></TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none" onClick={() => handleSort('currentModule')}><div className="flex items-center gap-2">Current Module <SortIcon field="currentModule" /></div></TableHead>
                  <TableHead className="pr-8 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStaff.map(staff => (
                  <TableRow key={staff.id} className={cn('group hover:bg-slate-50/30 transition-colors border-slate-50', highlightId === staff.id && 'bg-primary/5 animate-pulse')}>
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-sm">{staff.fullname?.charAt(0) || '?'}</div>
                          {staff.isOnline && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{staff.fullname}</p>
                          <p className="text-xs text-slate-400">Internal Personnel</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><code className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-md">{staff.username}</code></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-700">{staff.role}</span>
                        <p className="text-[9px] text-slate-400 font-medium">{staff.accessCount || 0} modules assigned</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {staff.inBoarding === false ? (
                        <Badge className="rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest bg-yellow-50 text-yellow-700 border-none">Offboarded</Badge>
                      ) : staff.isOnline ? (
                        <Badge className="rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-600 border-none">Online</Badge>
                      ) : (
                        <Badge className="rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border-none">Offline</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {staff.isOnline && staff.currentModule ? (
                        <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">{MODULE_LABELS[staff.currentModule] || staff.currentModule}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(staff)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditAccess(staff.id)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all"><ShieldCheck className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOutboard(staff)} className="h-9 w-9 rounded-xl hover:bg-yellow-50 text-yellow-500 transition-all"><LogOut className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {currentPage} of {totalPages || 1}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 rounded-xl border-slate-200 text-slate-600 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 7) {
                    if (i === 0) pageNum = 1;
                    else if (i === 1) pageNum = Math.max(2, currentPage - 1);
                    else if (i === 2) pageNum = Math.max(3, currentPage);
                    else if (i === 3) pageNum = Math.min(totalPages - 1, currentPage + 1);
                    else if (i === 4) pageNum = totalPages;
                    else if (i === 5) pageNum = totalPages - 1;
                    else pageNum = totalPages - 2;
                    if (i > 0 && pageNum === (i === 1 ? 1 : i === 2 ? Math.max(2, currentPage - 1) : 0)) pageNum = Math.min(totalPages, pageNum + 1);
                  }
                  return <button key={i} onClick={() => setCurrentPage(pageNum)} className={cn('w-8 h-8 rounded-xl text-[10px] font-black transition-all', currentPage === pageNum ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100')}>{pageNum}</button>;
                })}
              </div>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="h-8 rounded-xl border-slate-200 text-slate-600 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Staff Modal */}
      <DataModal open={modalOpen} onOpenChange={setModalOpen} title={editingStaff ? 'Update Personnel' : 'Onboard New Staff'} onSubmit={handleSave} isLoading={saving}>
        <div className="space-y-6 px-2">
          {formError && <ErrorHandler type={formError.type} title={formError.title} message={formError.message} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Full Legal Name</Label>
              <Input value={form.fullname} onChange={handleFullNameChange} placeholder="Ex. Michael Tan" className="rounded-xl border-slate-200 focus:ring-primary/20" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">System Username</Label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="autocare@john" className="rounded-xl border-slate-200" autoComplete="off" />
              <p className="text-[9px] text-slate-400">Auto-generated from full name</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Organizational Role</Label>
            <Select value={form.role} onValueChange={val => setForm({ ...form, role: val })}>
              <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {PREDEFINED_ROLES.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
                <SelectItem value="custom">+ Custom Role</SelectItem>
              </SelectContent>
            </Select>
            {form.role === 'custom' && <Input value={form.customRole} onChange={e => setForm({ ...form, customRole: e.target.value })} placeholder="Enter custom role" className="mt-2 rounded-xl border-slate-200" />}
          </div>
        </div>
      </DataModal>

      {/* Temp Password Dialog */}
      {tempPassword && (
        <TempPasswordDialog
          open={tempDialogOpen}
          onOpenChange={setTempDialogOpen}
          tempPassword={tempPassword}
          staffName={tempStaffName}
          onComplete={handleTempPasswordComplete}
        />
      )}

      {/* Access Modals (assignment & edit) */}
      <AccessModals
        accessModalOpen={accessModalOpen}
        setAccessModalOpen={setAccessModalOpen}
        editAccessModalOpen={editAccessModalOpen}
        setEditAccessModalOpen={setEditAccessModalOpen}
        staffIdForAccess={selectedStaffId}
        onAccessChanged={loadStaff}
        highlight={triggerHighlight}
      />
    </>
  );
}