'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PageContainer from '@/components/shared/page-container';
import DataModal from '@/components/shared/data-modal';
import EmptyState from '@/components/shared/empty-state';
import LoadingSpinner from '@/components/shared/loading-spinner';
import ErrorHandler from '@/components/shared/error-handler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  UserCog,
  Pencil,
  Search,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
  CheckCircle2,
  LogOut,
  Key,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { staffApi } from '@/lib/staffs/staffs';
import { accessApi } from '@/lib/staffs/access';
import { toast } from 'sonner';
import { useRealtimeStaffMonitor } from '@/connections/useRealtimeStaffMonitor';

// All possible module names (must match StaffAccess table columns)
const MODULES = [
  'dashboard',
  'customers',
  'appointments',
  'services',
  'staffs',
  'serviceTracking',
  'payments',
  'inventory',
];

// Human-readable labels for modules
const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  appointments: 'Appointments',
  services: 'Services',
  staffs: 'Staffs',
  serviceTracking: 'Service Tracking',
  payments: 'Payments',
  inventory: 'Inventory',
};

// Predefined roles
const PREDEFINED_ROLES = ['Admin', 'Mechanic', 'Assistant', 'Cashier'];

type SortField = 'fullname' | 'username' | 'role' | 'status' | 'accessCount' | 'currentModule';

export default function StaffManagement() {
  // ----------------------------------------------------------------
  // State
  // ----------------------------------------------------------------
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // 'all', 'online', 'offline', 'offboarded'

  // Sorting
  const [sortField, setSortField] = useState<SortField>('fullname');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter popover
  const [filterOpen, setFilterOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Create/Edit Staff Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [form, setForm] = useState({
    fullname: '',
    username: '',
    role: 'Mechanic',
    customRole: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<{ type: string; title: string; message: string } | null>(null);

  // Temp Password Dialog
  const [tempPasswordDialog, setTempPasswordDialog] = useState<{
    open: boolean;
    tempPassword: string;
    staffName: string;
    staffId: string;
  }>({
    open: false,
    tempPassword: '',
    staffName: '',
    staffId: '',
  });
  const [showTempPassword, setShowTempPassword] = useState(false);

  // Access Assignment Modal (for new staff after temp password)
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessStaffId, setAccessStaffId] = useState<string | null>(null);
  const [accessPermissions, setAccessPermissions] = useState<Record<string, boolean>>({});
  const [savingAccess, setSavingAccess] = useState(false);

  // Edit Access Modal
  const [editAccessModalOpen, setEditAccessModalOpen] = useState(false);
  const [editAccessStaffId, setEditAccessStaffId] = useState<string | null>(null);
  const [editAccessPermissions, setEditAccessPermissions] = useState<Record<string, boolean>>({});
  const [editAccessLoading, setEditAccessLoading] = useState(false);
  const [savingEditAccess, setSavingEditAccess] = useState(false);
  const [isNewAccess, setIsNewAccess] = useState(false);

  // Highlight staff (flash effect)
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHighlight = (id: string) => {
    setHighlightId(id);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightId(null), 2000);
  };

  // ----------------------------------------------------------------
  // Data Loading – fetch all staff (no search) + access counts
  // ----------------------------------------------------------------
  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all staff (client-side filtering later)
      const staffRes = await staffApi.list();
      if (staffRes.error) {
        toast.error(staffRes.errorMessage || 'Failed to load staff');
        setStaffList([]);
        setLoading(false);
        return;
      }

      const accessRes = await accessApi.listAll();
      const accessMap: Record<string, number> = {};
      if (!accessRes.error && accessRes.data) {
        accessRes.data.forEach((rec: any) => {
          const count = MODULES.filter(mod => rec[mod] === true).length;
          accessMap[rec.staffId] = count;
        });
      }

      const staffWithCount = (staffRes.data || []).map((staff: any) => ({
        ...staff,
        accessCount: accessMap[staff.id] || 0,
      }));

      setStaffList(staffWithCount);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Realtime subscription – silently refresh list on any staff change
  useRealtimeStaffMonitor({ onDataChanged: loadStaff });

  // ----------------------------------------------------------------
  // Client-side filtering, searching, sorting
  // ----------------------------------------------------------------
  const filteredAndSortedStaff = useMemo(() => {
    let data = [...staffList];

    // Search (client-side)
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(staff =>
        staff.fullname?.toLowerCase().includes(term) ||
        staff.username?.toLowerCase().includes(term) ||
        staff.role?.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (roleFilter !== 'ALL') {
      data = data.filter(staff => staff.role === roleFilter);
    }

    // Status filter (online, offline, offboarded)
    if (statusFilter === 'online') {
      data = data.filter(staff => staff.isOnline === true);
    } else if (statusFilter === 'offline') {
      data = data.filter(staff => staff.isOnline !== true && staff.inBoarding !== false);
    } else if (statusFilter === 'offboarded') {
      data = data.filter(staff => staff.inBoarding === false);
    }

    // Sort
    data.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'fullname':
          valA = (a.fullname || '').toLowerCase();
          valB = (b.fullname || '').toLowerCase();
          break;
        case 'username':
          valA = (a.username || '').toLowerCase();
          valB = (b.username || '').toLowerCase();
          break;
        case 'role':
          valA = (a.role || '').toLowerCase();
          valB = (b.role || '').toLowerCase();
          break;
        case 'status':
          // 0 = online, 1 = offline, 2 = offboarded
          valA = a.inBoarding === false ? 2 : (a.isOnline ? 0 : 1);
          valB = b.inBoarding === false ? 2 : (b.isOnline ? 0 : 1);
          break;
        case 'accessCount':
          valA = a.accessCount || 0;
          valB = b.accessCount || 0;
          break;
        case 'currentModule':
          valA = (a.currentModule || '').toLowerCase();
          valB = (b.currentModule || '').toLowerCase();
          break;
        default:
          return 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [staffList, search, roleFilter, statusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedStaff.length / itemsPerPage);
  const paginatedStaff = filteredAndSortedStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page on filter/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, sortField, sortDirection]);

  // ----------------------------------------------------------------
  // Sorting helpers
  // ----------------------------------------------------------------
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-primary" /> : <ArrowDown className="w-4 h-4 text-primary" />;
  };

  // ----------------------------------------------------------------
  // Filter reset
  // ----------------------------------------------------------------
  const resetFilters = () => {
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  const generateUsername = (fullName: string) => {
    const first = fullName.trim().split(' ')[0]?.toLowerCase() || '';
    return `autocare@${first}`;
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      fullname: val,
      username: generateUsername(val),
    }));
  };

  // ----------------------------------------------------------------
  // Create / Edit Staff Handlers
  // ----------------------------------------------------------------
  const openCreate = () => {
    setEditingStaff(null);
    setForm({
      fullname: '',
      username: '',
      role: 'Mechanic',
      customRole: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = async (staff: any) => {
    setEditingStaff(staff);
    setForm({
      fullname: staff.fullname || '',
      username: staff.username || '',
      role: staff.role || 'Mechanic',
      customRole: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const finalRole = form.role === 'custom' ? form.customRole.trim() : form.role;
    if (!form.fullname.trim() || !form.username.trim() || !finalRole) {
      setFormError({
        type: 'fve',
        title: 'Validation Error',
        message: 'Full name, username, and role are required.',
      });
      setSaving(false);
      return;
    }

    try {
      if (editingStaff) {
        const payload: any = {
          fullname: form.fullname.trim(),
          username: form.username.trim(),
          role: finalRole,
        };
        const res = await staffApi.update(editingStaff.id, payload);
        if (res.error) {
          setFormError({
            type: res.errorType || 'fve',
            title: res.errorTitle || 'Update failed',
            message: res.errorMessage || 'Could not update staff.',
          });
        } else {
          toast.success('Staff updated successfully.');
          setModalOpen(false);
          await loadStaff();
          triggerHighlight(editingStaff.id);
        }
      } else {
        const res = await staffApi.create({
          fullname: form.fullname.trim(),
          username: form.username.trim(),
          role: finalRole,
        });
        if (res.error) {
          setFormError({
            type: res.errorType || 'fve',
            title: res.errorTitle || 'Creation failed',
            message: res.errorMessage || 'Could not create staff.',
          });
        } else {
          const newStaff = res.data;
          const tempPw = res.data.tempPasswordPlain;
          setTempPasswordDialog({
            open: true,
            tempPassword: tempPw,
            staffName: newStaff.fullname,
            staffId: newStaff.id,
          });
          setModalOpen(false);
          await loadStaff();
          triggerHighlight(newStaff.id);
        }
      }
    } catch (err: any) {
      console.error(err);
      setFormError({
        type: 'se',
        title: 'Unexpected Error',
        message: err.message || 'Something went wrong.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------------
  // Outboarding
  // ----------------------------------------------------------------
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
      console.error(err);
      toast.error('Failed to outboard staff.');
    }
  };

  // ----------------------------------------------------------------
  // Access Management
  // ----------------------------------------------------------------
  const openAccessAssignment = (staffId: string) => {
    setAccessStaffId(staffId);
    const initial: Record<string, boolean> = {};
    MODULES.forEach((mod) => { initial[mod] = false; });
    setAccessPermissions(initial);
    setAccessModalOpen(true);
  };

  const handleSaveAccess = async () => {
    if (!accessStaffId) return;
    setSavingAccess(true);
    try {
      const res = await accessApi.create(accessStaffId, accessPermissions);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to assign access.');
      } else {
        toast.success('Access permissions assigned.');
        setAccessModalOpen(false);
        await loadStaff();
        triggerHighlight(accessStaffId);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign access.');
    } finally {
      setSavingAccess(false);
    }
  };

  const openEditAccess = async (staffId: string) => {
    if (!staffId) {
      toast.error('Invalid staff ID.');
      return;
    }

    setEditAccessStaffId(staffId);
    setEditAccessLoading(true);
    setEditAccessModalOpen(true);

    try {
      const res = await accessApi.get(staffId);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load access permissions.');
        setIsNewAccess(true);
        const initial: Record<string, boolean> = {};
        MODULES.forEach((mod) => { initial[mod] = false; });
        setEditAccessPermissions(initial);
      } else {
        const data = res.data;
        if (!data) {
          setIsNewAccess(true);
          const initial: Record<string, boolean> = {};
          MODULES.forEach((mod) => { initial[mod] = false; });
          setEditAccessPermissions(initial);
        } else {
          setIsNewAccess(false);
          const perms: Record<string, boolean> = {};
          MODULES.forEach((mod) => {
            perms[mod] = data[mod] === true;
          });
          setEditAccessPermissions(perms);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load access permissions.');
      setIsNewAccess(true);
      const initial: Record<string, boolean> = {};
      MODULES.forEach((mod) => { initial[mod] = false; });
      setEditAccessPermissions(initial);
    } finally {
      setEditAccessLoading(false);
    }
  };

  const handleSaveEditAccess = async () => {
    if (!editAccessStaffId) return;
    setSavingEditAccess(true);
    try {
      let res;
      if (isNewAccess) {
        res = await accessApi.create(editAccessStaffId, editAccessPermissions);
      } else {
        res = await accessApi.update(editAccessStaffId, editAccessPermissions);
      }
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to save access permissions.');
      } else {
        toast.success('Access permissions saved successfully.');
        setEditAccessModalOpen(false);
        await loadStaff();
        triggerHighlight(editAccessStaffId);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save access.');
    } finally {
      setSavingEditAccess(false);
    }
  };

  // ----------------------------------------------------------------
  // Copy & Temp Password helpers
  // ----------------------------------------------------------------
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Password copied to clipboard.');
  };

  const handleTempPasswordComplete = () => {
    const staffId = tempPasswordDialog.staffId;
    setTempPasswordDialog({ open: false, tempPassword: '', staffName: '', staffId: '' });
    setShowTempPassword(false);
    if (staffId) {
      openAccessAssignment(staffId);
    }
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  if (loading && staffList.length === 0) return <LoadingSpinner />;

  return (
    <PageContainer
      actions={
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-6 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      }
    >
      {/* ---- Search & Filter Bar ---- */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by name, role, or username..."
            className="pl-10 rounded-2xl border-slate-200 focus:ring-primary/20 transition-all bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                {(roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-4 rounded-2xl shadow-lg border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">Filter Staff</h4>
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                    <X className="w-3 h-3 mr-1" /> Reset
                  </Button>
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
                <Button variant="outline" size="sm" className="w-full" onClick={() => setFilterOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ---- Empty State ---- */}
      {filteredAndSortedStaff.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No staff members found"
          description={
            search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filters.'
              : 'Your team directory is currently empty.'
          }
        />
      ) : (
        <div className="space-y-6">
          {/* ---- Mobile Cards ---- */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {paginatedStaff.map((staff) => (
              <Card
                key={staff.id}
                className={cn(
                  'rounded-2xl border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform',
                  highlightId === staff.id && 'ring-2 ring-primary ring-offset-2 animate-pulse'
                )}
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                          {staff.fullname?.charAt(0) || '?'}
                        </div>
                        {staff.isOnline && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 leading-tight truncate">
                          {staff.fullname}
                        </p>
                        <p className="text-xs text-slate-400">@{staff.username}</p>
                        {staff.isOnline && staff.currentModule && (
                          <p className="text-[10px] text-primary font-semibold mt-0.5">
                            Viewing: {MODULE_LABELS[staff.currentModule] || staff.currentModule}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'rounded-lg border-none px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter',
                        staff.inBoarding === false
                          ? 'bg-yellow-100 text-yellow-700'
                          : staff.isOnline
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {staff.inBoarding === false ? 'Offboarded' : staff.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {staff.role}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(staff)} className="h-9 w-9 rounded-xl text-slate-400"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditAccess(staff.id)} className="h-9 w-9 rounded-xl text-slate-400"><Key className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOutboard(staff)} className="h-9 w-9 rounded-xl text-yellow-500"><LogOut className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ---- Desktop Table ---- */}
          <Card className="hidden md:block rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead
                    className="pl-8 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                    onClick={() => handleSort('fullname')}
                  >
                    <div className="flex items-center gap-2">Team Member <SortIcon field="fullname" /></div>
                  </TableHead>
                  <TableHead
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center gap-2">Username <SortIcon field="username" /></div>
                  </TableHead>
                  <TableHead
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-2">Role & Access <SortIcon field="role" /></div>
                  </TableHead>
                  <TableHead
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">Status <SortIcon field="status" /></div>
                  </TableHead>
                  <TableHead
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                    onClick={() => handleSort('currentModule')}
                  >
                    <div className="flex items-center gap-2">Current Module <SortIcon field="currentModule" /></div>
                  </TableHead>
                  <TableHead className="pr-8 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStaff.map((staff) => (
                  <TableRow
                    key={staff.id}
                    className={cn(
                      'group hover:bg-slate-50/30 transition-colors border-slate-50',
                      highlightId === staff.id && 'bg-primary/5 animate-pulse'
                    )}
                  >
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-sm">
                            {staff.fullname?.charAt(0) || '?'}
                          </div>
                          {staff.isOnline && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                          )}
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
                        <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                          {MODULE_LABELS[staff.currentModule] || staff.currentModule}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(staff)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditAccess(staff.id)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all"><ShieldCheck className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOutboard(staff)} className="h-9 w-9 rounded-xl hover:bg-yellow-50 text-yellow-500 transition-all"><LogOut className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* ---- Pagination ---- */}
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Page {currentPage} of {totalPages || 1}
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
                    if (
                      i > 0 &&
                      pageNum ===
                        (i === 1
                          ? 1
                          : i === 2
                          ? Math.max(2, currentPage - 1)
                          : 0)
                    )
                      pageNum = Math.min(totalPages, pageNum + 1);
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded-xl text-[10px] font-black transition-all',
                        currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'text-slate-400 hover:bg-slate-100'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="h-8 rounded-xl border-slate-200 text-slate-600 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Create / Edit Staff Modal ---------- */}
      <DataModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingStaff ? 'Update Personnel' : 'Onboard New Staff'}
        onSubmit={handleSave}
        isLoading={saving}
      >
        <div className="space-y-6 px-2">
          {formError && (
            <ErrorHandler
              type={formError.type}
              title={formError.title}
              message={formError.message}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Full Legal Name
              </Label>
              <Input
                value={form.fullname}
                onChange={handleFullNameChange}
                placeholder="Ex. Michael Tan"
                className="rounded-xl border-slate-200 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                System Username
              </Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="autocare@john"
                className="rounded-xl border-slate-200"
                autoComplete="off"
              />
              <p className="text-[9px] text-slate-400">Auto-generated from full name</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              Organizational Role
            </Label>
            <Select
              value={form.role}
              onValueChange={(val) => setForm({ ...form, role: val })}
            >
              <SelectTrigger className="rounded-xl border-slate-200">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
                <SelectItem value="custom">+ Custom Role</SelectItem>
              </SelectContent>
            </Select>
            {form.role === 'custom' && (
              <Input
                value={form.customRole}
                onChange={(e) => setForm({ ...form, customRole: e.target.value })}
                placeholder="Enter custom role"
                className="mt-2 rounded-xl border-slate-200"
              />
            )}
          </div>
        </div>
      </DataModal>

      {/* ---------- Temp Password Dialog ---------- */}
      <Dialog
        open={tempPasswordDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            // If closed without clicking Complete, we could still open access modal? Not needed.
          }
        }}
      >
        <DialogContent className="rounded-[2rem] sm:max-w-md border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-green-500" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-800">
              Personnel Registered
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              System access has been provisioned for{' '}
              <strong>{tempPasswordDialog.staffName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-900 p-6 rounded-[2rem] space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
              Temporary Password
            </p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-3xl font-mono font-black text-white tracking-tighter">
                {showTempPassword
                  ? tempPasswordDialog.tempPassword
                  : '••••••••'}
              </code>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-slate-400 hover:text-white"
                  onClick={() => setShowTempPassword(!showTempPassword)}
                >
                  {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-slate-400 hover:text-white"
                  onClick={() => copyToClipboard(tempPasswordDialog.tempPassword)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Account created successfully. Provide these credentials to the
              staff member. A password reset will be forced upon first login for
              security compliance.
            </p>
          </div>

          <Button
            className="w-full rounded-2xl h-12 font-black uppercase tracking-widest"
            onClick={handleTempPasswordComplete}
          >
            Complete Onboarding
          </Button>
        </DialogContent>
      </Dialog>

      {/* ---------- Access Assignment Modal (for new staff) ---------- */}
      <DataModal
        open={accessModalOpen}
        onOpenChange={setAccessModalOpen}
        title="Assign Module Access"
        description="Select the modules this staff member should be able to access."
        onSubmit={handleSaveAccess}
        isLoading={savingAccess}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULES.map((mod) => (
              <label
                key={mod}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                  accessPermissions[mod]
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                )}
              >
                <span className="text-xs font-bold tracking-tight">
                  {MODULE_LABELS[mod] || mod}
                </span>
                <Checkbox
                  checked={accessPermissions[mod] || false}
                  onCheckedChange={(checked) => {
                    setAccessPermissions((prev) => ({
                      ...prev,
                      [mod]: !!checked,
                    }));
                  }}
                  className="h-4 w-4 border-slate-300"
                />
              </label>
            ))}
          </div>
        </div>
      </DataModal>

      {/* ---------- Edit Access Modal (for existing staff) ---------- */}
      <DataModal
        open={editAccessModalOpen}
        onOpenChange={setEditAccessModalOpen}
        title={isNewAccess ? 'Assign Module Access' : 'Edit Module Access'}
        description={isNewAccess 
          ? 'This staff has no access record yet. Select the modules they should be able to access.'
          : 'Update the modules this staff member can access.'}
        onSubmit={handleSaveEditAccess}
        isLoading={savingEditAccess}
      >
        <div className="space-y-4">
          {editAccessLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODULES.map((mod) => (
                <label
                  key={mod}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                    editAccessPermissions[mod]
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  )}
                >
                  <span className="text-xs font-bold tracking-tight">
                    {MODULE_LABELS[mod] || mod}
                  </span>
                  <Checkbox
                    checked={editAccessPermissions[mod] || false}
                    onCheckedChange={(checked) =>
                      setEditAccessPermissions((prev) => ({ ...prev, [mod]: !!checked }))
                    }
                    className="h-4 w-4 border-slate-300"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </DataModal>
    </PageContainer>
  );
}