'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

import {
  Plus,
  UserCog,
  Pencil,
  Search,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LogOut,
  Key,
  ShieldCheck,
  ArrowUpFromLine,
  Download,
  SlidersHorizontal,
  MoreHorizontal,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  useStaffData,
} from '@/hooks/staffs/useStaffData';
import { useStaffForm } from '@/hooks/staffs/useStaffForm';

import {
  MODULES,
  MODULE_LABELS,
  PREDEFINED_ROLES,
  SortField,
} from '@/app-utils/staffs/constants';

import DataModal from '@/components/shared/data-modal';
import ErrorHandler from '@/components/shared/error-handler';
import TempPasswordDialog from './temp-password-dialog';
import AccessModals from './access-modals';
import StaffStatusConfirmationModal from './staff-status-confirmation-modal';
import EmptyState from '@/components/shared/empty-state';
import LoadingSpinner from '@/components/shared/loading-spinner';

import { toast } from 'sonner';
import { staffApi } from '@/lib/staffs/staffs';

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'offboarded', label: 'Offboarded' },
];

export default function StaffList() {
  const { data: session } = useSession();
  const currentStaffId = session?.user?.id;

  const { staffList, loading, loadStaff } = useStaffData();

  // Filter & Sort state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [sortField, setSortField] =
    useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] =
    useState<'asc' | 'desc'>('desc');
  const [filterOpen, setFilterOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Highlight
  const [highlightId, setHighlightId] =
    useState<string | null>(null);

  const highlightTimeoutRef =
    useRef<NodeJS.Timeout | null>(null);

  const triggerHighlight = (id: string) => {
    setHighlightId(id);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = setTimeout(
      () => setHighlightId(null),
      2000
    );
  };

  // Access modals state
  const [accessModalOpen, setAccessModalOpen] =
    useState(false);

  const [editAccessModalOpen, setEditAccessModalOpen] =
    useState(false);

  const [selectedStaffId, setSelectedStaffId] =
    useState<string | null>(null);

  // Use staff form hook
  const {
    modalOpen,
    setModalOpen,
    editingStaff,
    form,
    setForm,
    saving,
    formError,
    openCreate,
    openEdit,
    handleSave,
    handleFullNameChange,
    tempPassword,
    tempStaffName,
    tempStaffId,
    setTempPassword,
  } = useStaffForm(loadStaff, triggerHighlight);

  // Temp password dialog state
  const [tempDialogOpen, setTempDialogOpen] =
    useState(false);

  // Onboard / outboard confirmation modal state
  const [statusConfirmationOpen, setStatusConfirmationOpen] =
    useState(false);

  const [statusConfirmationAction, setStatusConfirmationAction] =
    useState<'onboard' | 'outboard' | null>(null);

  const [statusConfirmationStaff, setStatusConfirmationStaff] =
    useState<any | null>(null);

  const [statusConfirmationLoading, setStatusConfirmationLoading] =
    useState(false);

  // When a new staff is created, open the temp password dialog and remember the staff ID
  useEffect(() => {
    if (tempPassword) {
      setTempDialogOpen(true);
      setSelectedStaffId(tempStaffId);
    }
  }, [tempPassword, tempStaffId]);

  // ----- Open onboard confirmation modal -----
  const handleOnboard = (staff: any) => {
    setStatusConfirmationStaff(staff);
    setStatusConfirmationAction('onboard');
    setStatusConfirmationOpen(true);
  };

  // ----- Open outboard confirmation modal -----
  const handleOutboard = (staff: any) => {
    setStatusConfirmationStaff(staff);
    setStatusConfirmationAction('outboard');
    setStatusConfirmationOpen(true);
  };

  // ----- Execute confirmed onboard action -----
  const executeOnboard = async (staff: any) => {
    try {
      setStatusConfirmationLoading(true);

      const res = await staffApi.update(staff.id, {
        inBoarding: true,
      });

      if (res.error) {
        toast.error(
          res.errorMessage || 'Failed to onboard staff.'
        );
      } else {
        toast.success(
          `${staff.fullname} has been onboarded.`
        );

        await loadStaff();
        triggerHighlight(staff.id);

        setStatusConfirmationOpen(false);
        setStatusConfirmationStaff(null);
        setStatusConfirmationAction(null);
      }
    } catch (err) {
      toast.error('Failed to onboard staff.');
    } finally {
      setStatusConfirmationLoading(false);
    }
  };

  // ----- Execute confirmed outboard action -----
  const executeOutboard = async (staff: any) => {
    try {
      setStatusConfirmationLoading(true);

      const res = await staffApi.update(staff.id, {
        inBoarding: false,
      });

      if (res.error) {
        toast.error(
          res.errorMessage || 'Failed to outboard staff.'
        );
      } else {
        toast.success(
          `${staff.fullname} has been outboarded.`
        );

        await loadStaff();
        triggerHighlight(staff.id);

        setStatusConfirmationOpen(false);
        setStatusConfirmationStaff(null);
        setStatusConfirmationAction(null);
      }
    } catch (err) {
      toast.error('Failed to outboard staff.');
    } finally {
      setStatusConfirmationLoading(false);
    }
  };

  // ----- Confirm the selected onboard / outboard action -----
  const handleStatusConfirmation = async () => {
    if (!statusConfirmationStaff || !statusConfirmationAction) {
      return;
    }

    if (statusConfirmationAction === 'onboard') {
      await executeOnboard(statusConfirmationStaff);
      return;
    }

    await executeOutboard(statusConfirmationStaff);
  };

  const handleStatusConfirmationOpenChange = (open: boolean) => {
    if (statusConfirmationLoading) {
      return;
    }

    setStatusConfirmationOpen(open);

    if (!open) {
      setStatusConfirmationStaff(null);
      setStatusConfirmationAction(null);
    }
  };

  const handleEditAccess = (staffId: string) => {
    setSelectedStaffId(staffId);
    setEditAccessModalOpen(true);
  };

  const handleTempPasswordComplete = () => {
    setTempDialogOpen(false);
    setTempPassword(null);

    if (tempStaffId) {
      setSelectedStaffId(tempStaffId);
      setAccessModalOpen(true);
    } else {
      toast.error(
        'Could not determine staff ID. Please assign access manually.'
      );
    }
  };

  // Client-side filtering & sorting (also exclude current staff)
  const filteredAndSortedStaff = useMemo(() => {
    let data = [...staffList];

    if (currentStaffId) {
      data = data.filter(
        (s) => s.id !== currentStaffId
      );
    }

    // Search
    if (search.trim()) {
      const term = search.toLowerCase();

      data = data.filter(
        (s) =>
          s.fullname
            ?.toLowerCase()
            .includes(term) ||
          s.username
            ?.toLowerCase()
            .includes(term) ||
          s.role
            ?.toLowerCase()
            .includes(term)
      );
    }

    // Role filter
    if (roleFilter !== 'ALL') {
      data = data.filter(
        (s) => s.role === roleFilter
      );
    }

    // Status tab filter
    if (statusTab === 'online') {
      data = data.filter(
        (s) =>
          s.isOnline === true &&
          s.inBoarding !== false
      );
    } else if (statusTab === 'offline') {
      data = data.filter(
        (s) =>
          s.isOnline !== true &&
          s.inBoarding !== false
      );
    } else if (statusTab === 'offboarded') {
      data = data.filter(
        (s) => s.inBoarding === false
      );
    }

    // Sorting
    data.sort((a, b) => {
      let valA: any;
      let valB: any;

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
          valA =
            a.inBoarding === false
              ? 2
              : a.isOnline
                ? 0
                : 1;

          valB =
            b.inBoarding === false
              ? 2
              : b.isOnline
                ? 0
                : 1;
          break;

        case 'accessCount':
          valA = a.accessCount || 0;
          valB = b.accessCount || 0;
          break;

        case 'currentModule':
          valA = (
            a.currentModule || ''
          ).toLowerCase();

          valB = (
            b.currentModule || ''
          ).toLowerCase();
          break;

        case 'createdAt':
          valA = new Date(
            a.createdAt
          ).getTime();

          valB = new Date(
            b.createdAt
          ).getTime();
          break;

        default:
          return 0;
      }

      if (valA < valB) {
        return sortDirection === 'asc'
          ? -1
          : 1;
      }

      if (valA > valB) {
        return sortDirection === 'asc'
          ? 1
          : -1;
      }

      return 0;
    });

    return data;
  }, [
    staffList,
    search,
    roleFilter,
    statusTab,
    sortField,
    sortDirection,
    currentStaffId,
  ]);

  const totalPages = Math.ceil(
    filteredAndSortedStaff.length / itemsPerPage
  );

  const paginatedStaff =
    filteredAndSortedStaff.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    roleFilter,
    statusTab,
    sortField,
    sortDirection,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) =>
        prev === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({
    field,
  }: {
    field: SortField;
  }) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
      );
    }

    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const resetFilters = () => {
    setRoleFilter('ALL');
    setStatusTab('ALL');
  };

  const hasActiveFilters =
    roleFilter !== 'ALL' ||
    statusTab !== 'ALL';

  const getStatusCount = (value: string) => {
    if (value === 'ALL') {
      return currentStaffId
        ? staffList.filter(
            (s) => s.id !== currentStaffId
          ).length
        : staffList.length;
    }

    if (value === 'online') {
      return staffList.filter(
        (s) =>
          s.isOnline === true &&
          s.inBoarding !== false
      ).length;
    }

    if (value === 'offline') {
      return staffList.filter(
        (s) =>
          s.isOnline !== true &&
          s.inBoarding !== false
      ).length;
    }

    if (value === 'offboarded') {
      return staffList.filter(
        (s) => s.inBoarding === false
      ).length;
    }

    return 0;
  };

  const getStatusLabel = (staff: any) => {
    if (staff.inBoarding === false) {
      return 'Offboarded';
    }

    return staff.isOnline
      ? 'Online'
      : 'Offline';
  };

  const getStatusClass = (staff: any) => {
    if (staff.inBoarding === false) {
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400';
    }

    return staff.isOnline
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : 'border-border bg-muted text-muted-foreground';
  };

  const getStatusDotClass = (staff: any) => {
    if (staff.inBoarding === false) {
      return 'bg-amber-500';
    }

    return staff.isOnline
      ? 'bg-emerald-500'
      : 'bg-muted-foreground/50';
  };

  if (
    loading &&
    staffList.length === 0
  ) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {/* ============================================================
          TOP TOOLBAR
          ============================================================ */}
      <div className="space-y-3">
        {/* View controls */}
        <div
          className="
            flex flex-col gap-3
            border-b border-border pb-3
            md:flex-row md:items-center
            md:justify-between
          "
        >
          {/* Status segments */}
          <div
            className="
              flex w-full items-center overflow-x-auto
              rounded-lg border border-border
              bg-muted/40 p-1
              md:w-auto
            "
          >
            {STATUS_TABS.map((tab) => {
              const isActive =
                statusTab === tab.value;

              const count =
                getStatusCount(tab.value);

              return (
                <button
                  type="button"
                  key={tab.value}
                  onClick={() =>
                    setStatusTab(tab.value)
                  }
                  className={cn(
                    `
                    flex min-h-10 shrink-0
                    items-center gap-1.5
                    rounded-md px-3
                    text-sm font-medium
                    transition-colors
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                    md:h-8 md:min-h-0
                    md:px-3 md:text-xs
                    `,
                    isActive
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                  )}
                >
                  {tab.label}

                  <span
                    className={cn(
                      'text-[11px]',
                      isActive
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Primary action */}
          <Button
            type="button"
            onClick={openCreate}
            className="
              h-11 w-full rounded-md
              px-4 text-base font-medium
              shadow-sm
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              md:h-9 md:w-auto
              md:px-3 md:text-sm
            "
          >
            <Plus className="h-5 w-5 md:h-4 md:w-4" />
            Add Team Member
          </Button>
        </div>

        {/* Search / utilities */}
        <div
          className="
            flex flex-col gap-3
            md:flex-row md:items-center
            md:justify-between
          "
        >
          <div className="relative w-full md:max-w-md">
            <Search
              className="
                pointer-events-none absolute
                left-3 top-1/2
                h-5 w-5 -translate-y-1/2
                text-muted-foreground
                md:h-4 md:w-4
              "
            />

            <Input
              placeholder="Search by name or username..."
              aria-label="Search staff"
              className="
                h-11 rounded-md
                border-input bg-background
                pl-11 text-base
                shadow-none
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-1
                md:h-9 md:pl-10 md:text-sm
              "
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear search"
                onClick={() =>
                  setSearch('')
                }
                className="
                  absolute right-1.5 top-1/2
                  h-8 w-8 -translate-y-1/2
                  rounded-md
                  text-muted-foreground
                  hover:text-foreground
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

          <div className="flex items-center gap-2 overflow-x-auto">
            <div
              className="
                hidden items-center gap-2
                rounded-md border border-border
                bg-muted/30 px-3
                text-xs text-muted-foreground
                lg:flex
              "
            >
              <Users className="h-3.5 w-3.5" />
              <span>
                {filteredAndSortedStaff.length} team members
              </span>
            </div>
          </div>
        </div>

        <Popover
          open={filterOpen}
          onOpenChange={setFilterOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="
                h-10 rounded-md
                px-3 text-sm font-medium
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
                <span
                  className="
                    ml-1.5 h-1.5 w-1.5
                    rounded-full bg-primary
                  "
                />
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={8}
            className="
              w-[calc(100vw-2rem)] max-w-sm
              rounded-lg
              border-border
              bg-popover/95
              p-4 shadow-xl
              backdrop-blur-xl
            "
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Filter staff
                  </h4>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Refine the team directory.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="
                    h-8 rounded-md
                    px-2 text-xs
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
                  Role
                </Label>

                <Select
                  value={roleFilter}
                  onValueChange={setRoleFilter}
                >
                  <SelectTrigger
                    className="
                      h-11 rounded-md
                      text-base
                      focus-visible:ring-2
                      focus-visible:ring-ring
                      focus-visible:ring-offset-2
                      md:h-9 md:text-sm
                    "
                  >
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent className="rounded-lg">
                    <SelectItem value="ALL">
                      All Roles
                    </SelectItem>

                    {PREDEFINED_ROLES.map(
                      (role) => (
                        <SelectItem
                          key={role}
                          value={role}
                        >
                          {role}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {roleFilter !== 'ALL' && (
          <Badge
            variant="secondary"
            className="
              h-8 rounded-full
              px-2.5 text-[11px]
              font-medium
            "
          >
            Role: {roleFilter}
          </Badge>
        )}

        {statusTab !== 'ALL' && (
          <Badge
            variant="secondary"
            className="
              h-8 rounded-full
              px-2.5 text-[11px]
              font-medium
            "
          >
            Status:{' '}
            {
              STATUS_TABS.find(
                (tab) =>
                  tab.value === statusTab
              )?.label
            }
          </Badge>
        )}

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="
              h-8 rounded-md px-2
              text-xs text-muted-foreground
              hover:text-foreground
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
            "
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* ============================================================
          EMPTY STATES
          ============================================================ */}
      {filteredAndSortedStaff.length === 0 ? (
        <Card className="mt-4 rounded-xl border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              icon={UserCog}
              title="No staff members found"
              description={
                search ||
                roleFilter !== 'ALL' ||
                statusTab !== 'ALL'
                  ? 'Try adjusting your search or filters.'
                  : 'Your team directory is currently empty.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {/* ========================================================
              DATA CARD
              ======================================================== */}
          <Card
            className="
              overflow-hidden
              rounded-xl
              border-border
              bg-card
              shadow-sm
            "
          >
            <CardContent className="p-0">
              {/* ================= MOBILE ================= */}
              <div className="md:hidden">
                <div
                  className="
                    flex items-center justify-between
                    border-b border-border
                    bg-muted/25
                    px-4 py-3
                  "
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Team members
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {filteredAndSortedStaff.length}{' '}
                      records
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className="
                      rounded-full
                      bg-background
                      px-2.5 py-1
                      text-[11px]
                    "
                  >
                    Page {currentPage} of{' '}
                    {totalPages || 1}
                  </Badge>
                </div>

                <div className="divide-y divide-border">
                  {paginatedStaff.map(
                    (staff) => (
                      <div
                        key={staff.id}
                        className={cn(
                          'p-4 transition-colors',
                          highlightId ===
                            staff.id &&
                            'bg-primary/5'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <div
                              className="
                                flex h-11 w-11
                                items-center justify-center
                                rounded-lg
                                border border-border
                                bg-muted
                                text-sm font-semibold
                                text-foreground
                              "
                            >
                              {staff.fullname?.charAt(
                                0
                              ) || '?'}
                            </div>

                            <span
                              className={cn(
                                `
                                absolute -bottom-0.5
                                -right-0.5
                                h-3 w-3
                                rounded-full
                                border-2
                                border-card
                                `,
                                getStatusDotClass(
                                  staff
                                )
                              )}
                            />
                          </div>

                          {/* Identity */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold tracking-tight text-foreground">
                                  {staff.fullname}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  @{staff.username}
                                </p>
                              </div>

                              <Badge
                                variant="outline"
                                className={cn(
                                  `
                                  shrink-0 rounded-full
                                  px-2 py-0.5
                                  text-[10px]
                                  font-semibold
                                  `,
                                  getStatusClass(
                                    staff
                                  )
                                )}
                              >
                                <span
                                  className={cn(
                                    'mr-1.5 h-1.5 w-1.5 rounded-full',
                                    getStatusDotClass(
                                      staff
                                    )
                                  )}
                                />

                                {getStatusLabel(
                                  staff
                                )}
                              </Badge>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-md bg-muted/40 p-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Role
                                </p>

                                <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                                  {staff.role}
                                </p>
                              </div>

                              <div className="rounded-md bg-muted/40 p-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Access
                                </p>

                                <p className="mt-0.5 text-xs font-medium text-foreground">
                                  {staff.accessCount ||
                                    0}{' '}
                                  modules
                                </p>
                              </div>

                              {staff.isOnline &&
                                staff.currentModule && (
                                  <div className="col-span-2 rounded-md border border-primary/10 bg-primary/5 p-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Current module
                                    </p>

                                    <p className="mt-0.5 truncate text-xs font-medium text-primary">
                                      {
                                        MODULE_LABELS[
                                          staff
                                            .currentModule
                                        ] ||
                                        staff.currentModule
                                      }
                                    </p>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile action row */}
                        <div
                          className="
                            mt-4 flex items-center
                            gap-1
                            border-t border-border
                            pt-3
                          "
                        >
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              openEdit(staff)
                            }
                            className="
                              h-11 flex-1
                              rounded-md px-3
                              text-sm font-medium
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              handleEditAccess(
                                staff.id
                              )
                            }
                            className="
                              h-11
                              rounded-md
                              px-3
                              text-sm
                              font-medium
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            <Key className="h-4 w-4" />
                            Access
                          </Button>

                          {staff.inBoarding ===
                          false ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleOnboard(
                                  staff
                                )
                              }
                              aria-label={`Onboard ${staff.fullname}`}
                              className="
                                h-11 w-11
                                rounded-md
                                text-emerald-600
                                hover:bg-emerald-500/10
                                dark:text-emerald-400
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                              "
                            >
                              <ArrowUpFromLine className="h-5 w-5" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleOutboard(
                                  staff
                                )
                              }
                              aria-label={`Outboard ${staff.fullname}`}
                              className="
                                h-11 w-11
                                rounded-md
                                text-amber-600
                                hover:bg-amber-500/10
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                              "
                            >
                              <LogOut className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* ================= DESKTOP ================= */}
              <div className="hidden md:block">
                <div
                  className="
                    flex items-center justify-between
                    border-b border-border
                    bg-muted/20
                    px-4 py-3
                    lg:px-5
                  "
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Team directory
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Showing{' '}
                      <span className="font-semibold text-foreground">
                        {paginatedStaff.length}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold text-foreground">
                        {filteredAndSortedStaff.length}
                      </span>{' '}
                      records
                    </p>
                  </div>

                  <div className="hidden items-center gap-2 lg:flex">
                    <span className="text-xs text-muted-foreground">
                      Sorted by
                    </span>

                    <span className="text-xs font-medium text-foreground">
                      {sortField === 'fullname'
                        ? 'Full name'
                        : sortField === 'username'
                          ? 'Username'
                          : sortField === 'role'
                            ? 'Role'
                            : sortField ===
                                'status'
                              ? 'Status'
                              : sortField ===
                                  'accessCount'
                                ? 'Access count'
                                : sortField ===
                                    'currentModule'
                                  ? 'Current module'
                                  : 'Created date'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table className="min-w-[1050px]">
                    <TableHeader>
                      <TableRow
                        className="
                          border-border
                          bg-muted/30
                          hover:bg-muted/30
                        "
                      >
                        <TableHead className="h-11 w-[250px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSort(
                                'fullname'
                              )
                            }
                            aria-sort={
                              sortField ===
                              'fullname'
                                ? sortDirection ===
                                  'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                            className="
                              inline-flex items-center
                              gap-1.5 rounded-md
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            Full name
                            <SortIcon field="fullname" />
                          </button>
                        </TableHead>

                        <TableHead className="h-11 w-[190px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSort(
                                'username'
                              )
                            }
                            aria-sort={
                              sortField ===
                              'username'
                                ? sortDirection ===
                                  'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                            className="
                              inline-flex items-center
                              gap-1.5 rounded-md
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            Username
                            <SortIcon field="username" />
                          </button>
                        </TableHead>

                        <TableHead className="h-11 w-[190px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSort(
                                'role'
                              )
                            }
                            aria-sort={
                              sortField ===
                              'role'
                                ? sortDirection ===
                                  'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                            className="
                              inline-flex items-center
                              gap-1.5 rounded-md
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            Role
                            <SortIcon field="role" />
                          </button>
                        </TableHead>

                        <TableHead className="h-11 w-[150px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSort(
                                'status'
                              )
                            }
                            aria-sort={
                              sortField ===
                              'status'
                                ? sortDirection ===
                                  'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                            className="
                              inline-flex items-center
                              gap-1.5 rounded-md
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            Status
                            <SortIcon field="status" />
                          </button>
                        </TableHead>

                        <TableHead className="h-11 w-[190px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSort(
                                'currentModule'
                              )
                            }
                            aria-sort={
                              sortField ===
                              'currentModule'
                                ? sortDirection ===
                                  'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                            className="
                              inline-flex items-center
                              gap-1.5 rounded-md
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            Current module
                            <SortIcon field="currentModule" />
                          </button>
                        </TableHead>

                        <TableHead className="h-11 w-[120px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSort(
                                'accessCount'
                              )
                            }
                            aria-sort={
                              sortField ===
                              'accessCount'
                                ? sortDirection ===
                                  'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                            className="
                              inline-flex items-center
                              gap-1.5 rounded-md
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            Access
                            <SortIcon field="accessCount" />
                          </button>
                        </TableHead>

                        <TableHead className="h-11 w-[170px] px-4 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {paginatedStaff.map(
                        (staff) => (
                          <TableRow
                            key={staff.id}
                            className={cn(
                              `
                              border-border
                              transition-colors
                              hover:bg-muted/20
                              `,
                              highlightId ===
                                staff.id &&
                                'bg-primary/5'
                            )}
                          >
                            {/* Full name */}
                            <TableCell className="px-4 py-2.5 lg:px-5">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <div
                                    className="
                                      flex h-9 w-9
                                      items-center justify-center
                                      rounded-lg
                                      bg-primary/10
                                      text-sm font-semibold
                                      text-primary
                                    "
                                  >
                                    {staff.fullname?.charAt(
                                      0
                                    ) || '?'}
                                  </div>

                                  <span
                                    className={cn(
                                      `
                                      absolute -bottom-0.5
                                      -right-0.5
                                      h-2.5 w-2.5
                                      rounded-full
                                      border-2
                                      border-card
                                      `,
                                      getStatusDotClass(
                                        staff
                                      )
                                    )}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p className="max-w-[175px] truncate text-sm font-medium text-foreground">
                                    {staff.fullname}
                                  </p>

                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    Team member
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Username */}
                            <TableCell className="px-4 py-2.5 lg:px-5">
                              <code
                                className="
                                  inline-flex max-w-[160px]
                                  truncate rounded-md
                                  bg-muted px-2 py-1
                                  font-mono text-xs
                                  text-muted-foreground
                                "
                              >
                                @{staff.username}
                              </code>
                            </TableCell>

                            {/* Role */}
                            <TableCell className="px-4 py-2.5 lg:px-5">
                              <div className="min-w-0">
                                <p className="max-w-[165px] truncate text-sm font-medium text-foreground">
                                  {staff.role}
                                </p>

                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  Staff role
                                </p>
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="px-4 py-2.5 lg:px-5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  `
                                  inline-flex
                                  items-center gap-1.5
                                  rounded-full
                                  px-2 py-0.5
                                  text-[11px]
                                  font-semibold
                                  `,
                                  getStatusClass(
                                    staff
                                  )
                                )}
                              >
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    getStatusDotClass(
                                      staff
                                    )
                                  )}
                                />

                                {getStatusLabel(
                                  staff
                                )}
                              </Badge>
                            </TableCell>

                            {/* Current module */}
                            <TableCell className="px-4 py-2.5 lg:px-5">
                              {staff.isOnline &&
                              staff.currentModule ? (
                                <span
                                  className="
                                    inline-flex max-w-[165px]
                                    truncate
                                    rounded-md
                                    border
                                    border-primary/10
                                    bg-primary/5
                                    px-2 py-1
                                    text-xs font-medium
                                    text-primary
                                  "
                                >
                                  {MODULE_LABELS[
                                    staff
                                      .currentModule
                                  ] ||
                                    staff.currentModule}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>

                            {/* Access count */}
                            <TableCell className="px-4 py-2.5 lg:px-5">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />

                                <span className="text-sm font-medium text-foreground">
                                  {staff.accessCount ||
                                    0}
                                </span>

                                <span className="text-[11px] text-muted-foreground">
                                  modules
                                </span>
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="px-4 py-2.5 lg:px-5">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openEdit(
                                      staff
                                    )
                                  }
                                  aria-label={`Edit ${staff.fullname}`}
                                  className="
                                    h-8 rounded-md
                                    px-2.5 text-xs
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-ring
                                    focus-visible:ring-offset-2
                                  "
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleEditAccess(
                                      staff.id
                                    )
                                  }
                                  aria-label={`Edit access for ${staff.fullname}`}
                                  className="
                                    h-8 w-8 rounded-md
                                    text-muted-foreground
                                    hover:text-foreground
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-ring
                                    focus-visible:ring-offset-2
                                  "
                                >
                                  <Key className="h-4 w-4" />
                                </Button>

                                {staff.inBoarding ===
                                false ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleOnboard(
                                        staff
                                      )
                                    }
                                    aria-label={`Onboard ${staff.fullname}`}
                                    className="
                                      h-8 w-8 rounded-md
                                      text-emerald-600
                                      hover:bg-emerald-500/10
                                      dark:text-emerald-400
                                      focus-visible:outline-none
                                      focus-visible:ring-2
                                      focus-visible:ring-ring
                                      focus-visible:ring-offset-2
                                    "
                                  >
                                    <ArrowUpFromLine className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleOutboard(
                                        staff
                                      )
                                    }
                                    aria-label={`Outboard ${staff.fullname}`}
                                    className="
                                      h-8 w-8 rounded-md
                                      text-amber-600
                                      hover:bg-amber-500/10
                                      focus-visible:outline-none
                                      focus-visible:ring-2
                                      focus-visible:ring-ring
                                      focus-visible:ring-offset-2
                                    "
                                  >
                                    <LogOut className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* ================= PAGINATION ================= */}
              <div
                className="
                  flex flex-col gap-3
                  border-t border-border
                  bg-muted/20
                  px-4 py-3
                  sm:flex-row sm:items-center
                  sm:justify-between
                  lg:px-5
                "
              >
                <p className="text-xs text-muted-foreground">
                  <span className="sm:hidden">
                    Page{' '}
                    <span className="font-semibold text-foreground">
                      {currentPage}
                    </span>{' '}
                    of{' '}
                    {totalPages || 1}
                  </span>

                  <span className="hidden sm:inline">
                    Showing{' '}
                    <span className="font-semibold text-foreground">
                      {paginatedStaff.length}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-foreground">
                      {
                        filteredAndSortedStaff.length
                      }
                    </span>{' '}
                    records
                  </span>
                </p>

                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage(
                        (p) =>
                          Math.max(
                            1,
                            p - 1
                          )
                      )
                    }
                    aria-label="Previous page"
                    className="
                      h-9 w-9 rounded-md
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-ring
                      focus-visible:ring-offset-2
                    "
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="hidden items-center gap-1 md:flex">
                    {Array.from({
                      length: totalPages,
                    }).map((_, i) => {
                      const page =
                        i + 1;

                      return (
                        <Button
                          type="button"
                          key={page}
                          size="icon"
                          variant={
                            currentPage ===
                            page
                              ? 'default'
                              : 'ghost'
                          }
                          onClick={() =>
                            setCurrentPage(
                              page
                            )
                          }
                          aria-label={`Go to page ${page}`}
                          aria-current={
                            currentPage ===
                            page
                              ? 'page'
                              : undefined
                          }
                          className="
                            h-8 w-8 rounded-md
                            text-xs font-medium
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
                      currentPage ===
                        totalPages ||
                      totalPages === 0
                    }
                    onClick={() =>
                      setCurrentPage(
                        (p) =>
                          Math.min(
                            Math.max(
                              totalPages,
                              1
                            ),
                            p + 1
                          )
                      )
                    }
                    aria-label="Next page"
                    className="
                      h-9 w-9 rounded-md
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
        </div>
      )}

      {/* ============================================================
          CREATE / EDIT STAFF MODAL
          ============================================================ */}
      <DataModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={
          editingStaff
            ? 'Update Personnel'
            : 'Onboard New Staff'
        }
        onSubmit={handleSave}
        isLoading={saving}
      >
        <div className="space-y-5 px-1">
          {formError && (
            <ErrorHandler
              type={formError.type}
              title={formError.title}
              message={formError.message}
            />
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3.5">
            <p className="text-sm font-semibold text-foreground">
              Staff account
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Enter the personnel details and assign an
              organizational role.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Full Name
              </Label>

              <Input
                value={form.fullname}
                onChange={handleFullNameChange}
                placeholder="Ex. Michael Tan"
                className="
                  h-11 rounded-md
                  border-input
                  text-base
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-1
                  md:h-9 md:text-sm
                "
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                System Username
              </Label>

              <Input
                value={form.username}
                onChange={(e) =>
                  setForm({
                    ...form,
                    username:
                      e.target.value,
                  })
                }
                placeholder="autocare@john"
                className="
                  h-11 rounded-md
                  border-input
                  text-base
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-1
                  md:h-9 md:text-sm
                "
                autoComplete="off"
              />

              <p className="text-xs text-muted-foreground">
                Auto-generated from full name
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Organizational Role
            </Label>

            <Select
              value={form.role}
              onValueChange={(val) =>
                setForm({
                  ...form,
                  role: val,
                })
              }
            >
              <SelectTrigger
                className="
                  h-11 rounded-md
                  text-base
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                  md:h-9 md:text-sm
                "
              >
                <SelectValue placeholder="Select role" />
              </SelectTrigger>

              <SelectContent className="rounded-lg">
                {PREDEFINED_ROLES.map(
                  (role) => (
                    <SelectItem
                      key={role}
                      value={role}
                    >
                      {role}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            {form.role === 'custom' && (
              <Input
                value={form.customRole}
                onChange={(e) =>
                  setForm({
                    ...form,
                    customRole:
                      e.target.value,
                  })
                }
                placeholder="Enter custom role"
                className="
                  mt-2 h-11 rounded-md
                  border-input
                  text-base
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-1
                  md:h-9 md:text-sm
                "
              />
            )}
          </div>
        </div>
      </DataModal>

      {/* ============================================================
          TEMP PASSWORD
          ============================================================ */}
      {tempPassword && (
        <TempPasswordDialog
          open={tempDialogOpen}
          onOpenChange={setTempDialogOpen}
          tempPassword={tempPassword}
          staffName={tempStaffName}
          onComplete={
            handleTempPasswordComplete
          }
        />
      )}

      {/* ============================================================
          ONBOARD / OUTBOARD CONFIRMATION MODAL
          ============================================================ */}
      <StaffStatusConfirmationModal
        open={statusConfirmationOpen}
        onOpenChange={
          handleStatusConfirmationOpenChange
        }
        action={statusConfirmationAction}
        staffName={
          statusConfirmationStaff?.fullname ||
          'this staff member'
        }
        onConfirm={
          handleStatusConfirmation
        }
        isLoading={
          statusConfirmationLoading
        }
      />

      {/* ============================================================
          ACCESS MODALS
          ============================================================ */}
      <AccessModals
        accessModalOpen={accessModalOpen}
        setAccessModalOpen={
          setAccessModalOpen
        }
        editAccessModalOpen={
          editAccessModalOpen
        }
        setEditAccessModalOpen={
          setEditAccessModalOpen
        }
        staffIdForAccess={
          selectedStaffId
        }
        onAccessChanged={loadStaff}
        highlight={triggerHighlight}
      />
    </>
  );
}