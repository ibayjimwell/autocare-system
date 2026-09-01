'use client';

import React, {
  useState,
  useMemo,
  useEffect,
} from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Badge,
} from '@/components/ui/badge';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  PackageCheck,
  SlidersHorizontal,
  Download,
  MoreHorizontal,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  useServiceData,
} from '@/hooks/services/useServiceData';

import {
  formatPrice,
  typeBadgeConfig,
  SERVICE_TYPES,
} from '@/app-utils/services/helpers';

import ServiceFormModal from './service-form-modal';
import ServiceDialogs from './service-dialogs';

import EmptyState from '@/components/shared/empty-state';
import LoadingSpinner from '@/components/shared/loading-spinner';
import ErrorHandler from '@/components/shared/error-handler';

type SortField =
  | 'name'
  | 'basePrice'
  | 'durationMinutes'
  | 'type'
  | 'status';

interface ServiceListProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

export default function ServiceList({
  modalOpen,
  setModalOpen,
}: ServiceListProps) {
  const {
    services,
    loading,
    apiError,
    loadServices,
    disableService,
    enableService,
  } = useServiceData();

  const [searchQuery, setSearchQuery] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<string>('active');

  const [typeFilter, setTypeFilter] =
    useState<string>('ALL');

  const [sortField, setSortField] =
    useState<SortField>('name');

  const [sortDirection, setSortDirection] =
    useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] =
    useState(1);

  const itemsPerPage = 8;

  const [editingService, setEditingService] =
    useState<any>(null);

  const [deactivateDialog, setDeactivateDialog] =
    useState({
      open: false,
      id: null as string | null,
      name: '',
    });

  const [enableDialog, setEnableDialog] =
    useState({
      open: false,
      id: null as string | null,
      name: '',
    });

  const [filterOpen, setFilterOpen] =
    useState(false);

  const filteredServices = useMemo(() => {
    let data = [...services];

    if (searchQuery.trim()) {
      const term =
        searchQuery.toLowerCase();

      data = data.filter(
        (t) =>
          t.name
            .toLowerCase()
            .includes(term) ||
          (t.description || '')
            .toLowerCase()
            .includes(term) ||
          (t.type || '')
            .toLowerCase()
            .includes(term)
      );
    }

    if (statusFilter === 'active') {
      data = data.filter(
        (t) => t.active
      );
    } else if (
      statusFilter === 'disabled'
    ) {
      data = data.filter(
        (t) => !t.active
      );
    }

    if (typeFilter !== 'ALL') {
      data = data.filter(
        (t) => t.type === typeFilter
      );
    }

    data.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortField) {
        case 'name':
          valA = (
            a.name || ''
          ).toLowerCase();
          valB = (
            b.name || ''
          ).toLowerCase();
          break;

        case 'basePrice':
          valA =
            parseFloat(a.basePrice) ||
            0;
          valB =
            parseFloat(b.basePrice) ||
            0;
          break;

        case 'durationMinutes':
          valA =
            a.durationMinutes || 0;
          valB =
            b.durationMinutes || 0;
          break;

        case 'type':
          valA = (
            a.type || ''
          ).toLowerCase();
          valB = (
            b.type || ''
          ).toLowerCase();
          break;

        case 'status':
          valA = a.active ? 0 : 1;
          valB = b.active ? 0 : 1;
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
    services,
    searchQuery,
    statusFilter,
    typeFilter,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.ceil(
    filteredServices.length /
      itemsPerPage
  );

  const paginatedData =
    filteredServices.slice(
      (currentPage - 1) *
        itemsPerPage,
      currentPage * itemsPerPage
    );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    statusFilter,
    typeFilter,
    sortField,
    sortDirection,
  ]);

  const handleSort = (
    field: SortField
  ) => {
    if (sortField === field) {
      setSortDirection(
        (prev) =>
          prev === 'asc'
            ? 'desc'
            : 'asc'
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
    setStatusFilter('active');
    setTypeFilter('ALL');
    setSearchQuery('');
  };

  const hasTypeFilter =
    typeFilter !== 'ALL';

  const hasFilters =
    statusFilter !== 'active' ||
    typeFilter !== 'ALL' ||
    Boolean(searchQuery);

  const getStatusCount = (
    status: 'active' | 'disabled'
  ) => {
    if (status === 'active') {
      return services.filter(
        (service) => service.active
      ).length;
    }

    return services.filter(
      (service) => !service.active
    ).length;
  };

  const typeBadge = (
    type: string
  ) => (
    <span
      className={cn(
        `
        inline-flex items-center
        rounded-full
        border
        px-2 py-0.5
        text-[10px]
        font-semibold uppercase
        tracking-wide
        `,
        typeBadgeConfig[type] ||
          'border-border bg-muted text-muted-foreground'
      )}
    >
      {type}
    </span>
  );

  const handleDisable =
    async () => {
      if (deactivateDialog.id) {
        const ok =
          await disableService(
            deactivateDialog.id,
            deactivateDialog.name
          );

        if (ok) {
          setDeactivateDialog({
            open: false,
            id: null,
            name: '',
          });
        }
      }
    };

  const handleEnable =
    async () => {
      if (enableDialog.id) {
        const ok =
          await enableService(
            enableDialog.id,
            enableDialog.name
          );

        if (ok) {
          setEnableDialog({
            open: false,
            id: null,
            name: '',
          });
        }
      }
    };

  if (
    loading &&
    services.length === 0
  ) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {/* ============================================================
          STATUS + ACTION ROW
          ============================================================ */}
      <div
        className="
          flex flex-col gap-3
          border-b border-border
          pb-3
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        {/* Status segmented control */}
        <div
          className="
            flex w-full items-center
            rounded-lg
            border border-border
            bg-muted/40
            p-1
            md:w-auto
          "
        >
          <button
            type="button"
            onClick={() =>
              setStatusFilter('active')
            }
            className={cn(
              `
              flex min-h-10 flex-1
              items-center justify-center
              gap-1.5 rounded-md
              px-4
              text-sm font-medium
              transition-colors
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              md:h-8 md:min-h-0
              md:flex-none
              md:px-3
              md:text-xs
              `,
              statusFilter === 'active'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
            )}
          >
            Active
            <span className="text-[11px] text-muted-foreground">
              {getStatusCount('active')}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter('disabled')
            }
            className={cn(
              `
              flex min-h-10 flex-1
              items-center justify-center
              gap-1.5 rounded-md
              px-4
              text-sm font-medium
              transition-colors
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              md:h-8 md:min-h-0
              md:flex-none
              md:px-3
              md:text-xs
              `,
              statusFilter ===
                'disabled'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
            )}
          >
            Disabled
            <span className="text-[11px] text-muted-foreground">
              {getStatusCount('disabled')}
            </span>
          </button>
        </div>

        {/* Summary + primary action */}
        <div className="flex items-center gap-2">
          <div
            className="
              hidden items-center gap-2
              rounded-md
              border border-border
              bg-muted/30
              px-3
              text-xs text-muted-foreground
              lg:flex
            "
          >
            <PackageCheck className="h-3.5 w-3.5" />
            {filteredServices.length} services
          </div>

          <Button
            type="button"
            onClick={() => {
              setEditingService(null);
              setModalOpen(true);
            }}
            className="
              h-11 w-full
              rounded-md
              px-4
              text-base font-medium
              shadow-sm
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              md:h-9 md:w-auto
              md:px-3
              md:text-sm
            "
          >
            <Plus className="h-5 w-5 md:h-4 md:w-4" />
            Add Service
          </Button>
        </div>
      </div>

      {/* ============================================================
          SEARCH / UTILITY ROW
          ============================================================ */}
      <div
        className="
          mt-3 flex flex-col gap-3
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        <div className="w-full md:max-w-md">
          <div className="relative">
            <Search
              className="
                pointer-events-none
                absolute left-3 top-1/2
                h-5 w-5
                -translate-y-1/2
                text-muted-foreground
                md:h-4 md:w-4
              "
            />

            <Input
              aria-label="Search services"
              placeholder="Search by service name or type..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              className="
                h-11 rounded-md
                bg-background
                pl-11
                text-base
                shadow-none
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-1
                md:h-9 md:pl-10
                md:text-sm
              "
            />

            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear service search"
                onClick={() =>
                  setSearchQuery('')
                }
                className="
                  absolute right-1.5 top-1/2
                  h-8 w-8
                  -translate-y-1/2
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
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <Popover
            open={filterOpen}
            onOpenChange={setFilterOpen}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="
                  h-11 shrink-0
                  rounded-md
                  px-3
                  text-sm font-medium
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                  md:h-9
                "
              >
                <Filter className="h-4 w-4" />
                Type

                {hasTypeFilter && (
                  <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              sideOffset={8}
              className="
                w-[calc(100vw-2rem)]
                max-w-xs
                rounded-lg
                border-border
                bg-popover/95
                p-2
                shadow-xl
                backdrop-blur-xl
              "
            >
              <div className="space-y-1">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-foreground">
                    Filter by type
                  </p>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Select a service category.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('ALL');
                    setFilterOpen(false);
                  }}
                  className={cn(
                    `
                    flex h-10 w-full
                    items-center
                    rounded-md
                    px-3
                    text-left
                    text-sm
                    font-medium
                    transition-colors
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                    `,
                    typeFilter === 'ALL'
                      ? 'bg-primary/5 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  All Types
                </button>

                {SERVICE_TYPES.map(
                  (type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => {
                        setTypeFilter(
                          type
                        );
                        setFilterOpen(
                          false
                        );
                      }}
                      className={cn(
                        `
                        flex h-10 w-full
                        items-center
                        rounded-md
                        px-3
                        text-left
                        text-sm
                        font-medium
                        transition-colors
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                        `,
                        typeFilter ===
                          type
                          ? 'bg-primary/5 text-primary'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="outline"
            className="
              hidden h-9
              shrink-0
              rounded-md
              px-3
              text-sm
              font-medium
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
              hidden h-9
              shrink-0
              rounded-md
              px-3
              text-sm
              font-medium
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
            aria-label="More service actions"
            className="
              hidden h-9 w-9
              shrink-0
              rounded-md
              lg:inline-flex
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

      {/* ============================================================
          FILTER SUMMARY
          ============================================================ */}
      {hasFilters && (
        <div
          className="
            mt-3 flex flex-wrap
            items-center gap-2
            rounded-lg
            border border-border
            bg-card
            p-2
            md:bg-transparent
            md:p-0
            md:border-0
          "
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Filters
          </span>

          {statusFilter !== 'active' && (
            <Badge
              variant="secondary"
              className="
                rounded-full
                px-2.5 py-1
                text-[11px]
                font-medium
              "
            >
              Disabled
            </Badge>
          )}

          {typeFilter !== 'ALL' && (
            <Badge
              variant="secondary"
              className="
                rounded-full
                px-2.5 py-1
                text-[11px]
                font-medium
              "
            >
              Type: {typeFilter}
            </Badge>
          )}

          {searchQuery && (
            <Badge
              variant="secondary"
              className="
                max-w-full
                truncate
                rounded-full
                px-2.5 py-1
                text-[11px]
                font-medium
              "
            >
              Search: {searchQuery}
            </Badge>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="
              h-8 rounded-md
              px-2
              text-xs
              text-muted-foreground
              hover:text-foreground
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
            "
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}

      {/* Error */}
      {apiError && (
        <div className="mt-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      {/* ============================================================
          EMPTY
          ============================================================ */}
      {filteredServices.length === 0 ? (
        <Card className="mt-4 rounded-xl border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              icon={Cog}
              title={
                statusFilter === 'disabled'
                  ? 'No disabled services found'
                  : 'No active services found'
              }
              description={
                searchQuery ||
                typeFilter !== 'ALL'
                  ? 'Try adjusting your search or filters.'
                  : 'Start by creating a new service category.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card
          className="
            mt-4 overflow-hidden
            rounded-xl
            border-border
            bg-card
            shadow-sm
          "
        >
          <CardContent className="p-0">
            {/* ========================================================
                MOBILE LIST
                ======================================================== */}
            <div className="md:hidden">
              <div
                className="
                  flex items-center
                  justify-between
                  border-b border-border
                  bg-muted/25
                  px-4 py-3
                "
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Service catalog
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {filteredServices.length}{' '}
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
                {paginatedData.map(
                  (service) => (
                    <div
                      key={service.id}
                      className="
                        p-4
                        transition-colors
                        hover:bg-muted/20
                      "
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="
                            flex h-11 w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-primary/10
                            bg-primary/10
                            text-primary
                          "
                        >
                          <Cog className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
                                {service.name}
                              </h3>

                              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                {service.description ||
                                  'No description provided'}
                              </p>
                            </div>

                            <Badge
                              variant="outline"
                              className={cn(
                                `
                                shrink-0
                                rounded-full
                                px-2 py-0.5
                                text-[10px]
                                font-semibold
                                `,
                                service.active
                                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-destructive/20 bg-destructive/10 text-destructive'
                              )}
                            >
                              <span
                                className={cn(
                                  'mr-1.5 h-1.5 w-1.5 rounded-full',
                                  service.active
                                    ? 'bg-emerald-500'
                                    : 'bg-destructive'
                                )}
                              />
                              {service.active
                                ? 'Active'
                                : 'Disabled'}
                            </Badge>
                          </div>

                          <div className="mt-3">
                            {typeBadge(
                              service.type
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div
                              className="
                                rounded-md
                                bg-muted/40
                                p-2.5
                              "
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Base price
                              </p>

                              <div className="mt-1 flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5 text-primary" />

                                <p className="text-sm font-semibold text-foreground">
                                  ₱
                                  {formatPrice(
                                    service.basePrice
                                  )}
                                </p>
                              </div>
                            </div>

                            <div
                              className="
                                rounded-md
                                bg-muted/40
                                p-2.5
                              "
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Duration
                              </p>

                              <div className="mt-1 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-primary" />

                                <p className="text-sm font-semibold text-foreground">
                                  {
                                    service.durationMinutes
                                  }{' '}
                                  min
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

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
                          onClick={() => {
                            setEditingService(
                              service
                            );
                            setModalOpen(
                              true
                            );
                          }}
                          className="
                            h-11 flex-1
                            rounded-md
                            px-3
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

                        {service.active ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeactivateDialog(
                                {
                                  open: true,
                                  id: service.id,
                                  name: service.name,
                                }
                              )
                            }
                            aria-label={`Disable ${service.name}`}
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
                            <PowerOff className="h-5 w-5" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setEnableDialog(
                                {
                                  open: true,
                                  id: service.id,
                                  name: service.name,
                                }
                              )
                            }
                            aria-label={`Enable ${service.name}`}
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
                            <CheckCircle2 className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* ========================================================
                DESKTOP TABLE
                ======================================================== */}
            <div className="hidden md:block">
              <div
                className="
                  flex items-center
                  justify-between
                  border-b border-border
                  bg-muted/20
                  px-4 py-3
                  lg:px-5
                "
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Service records
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Showing{' '}
                    <span className="font-semibold text-foreground">
                      {paginatedData.length}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-foreground">
                      {filteredServices.length}
                    </span>{' '}
                    matching services
                  </p>
                </div>

                <div className="hidden items-center gap-2 lg:flex">
                  <span className="text-xs text-muted-foreground">
                    Sorted by
                  </span>

                  <span className="text-xs font-medium text-foreground">
                    {sortField === 'name'
                      ? 'Name'
                      : sortField ===
                          'basePrice'
                        ? 'Base price'
                        : sortField ===
                            'durationMinutes'
                          ? 'Duration'
                          : sortField ===
                              'type'
                            ? 'Type'
                            : 'Status'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[960px]">
                  <TableHeader>
                    <TableRow
                      className="
                        border-border
                        bg-muted/30
                        hover:bg-muted/30
                      "
                    >
                      <TableHead className="h-11 w-[300px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                        <button
                          type="button"
                          onClick={() =>
                            handleSort(
                              'name'
                            )
                          }
                          aria-sort={
                            sortField ===
                            'name'
                              ? sortDirection ===
                                'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-md
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                          "
                        >
                          Service
                          <SortIcon field="name" />
                        </button>
                      </TableHead>

                      <TableHead className="h-11 w-[150px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                        <button
                          type="button"
                          onClick={() =>
                            handleSort(
                              'type'
                            )
                          }
                          aria-sort={
                            sortField ===
                            'type'
                              ? sortDirection ===
                                'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-md
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                          "
                        >
                          Type
                          <SortIcon field="type" />
                        </button>
                      </TableHead>

                      <TableHead className="h-11 w-[155px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                        <button
                          type="button"
                          onClick={() =>
                            handleSort(
                              'basePrice'
                            )
                          }
                          aria-sort={
                            sortField ===
                            'basePrice'
                              ? sortDirection ===
                                'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-md
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                          "
                        >
                          Base price
                          <SortIcon field="basePrice" />
                        </button>
                      </TableHead>

                      <TableHead className="h-11 w-[160px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                        <button
                          type="button"
                          onClick={() =>
                            handleSort(
                              'durationMinutes'
                            )
                          }
                          aria-sort={
                            sortField ===
                            'durationMinutes'
                              ? sortDirection ===
                                'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                          className="
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-md
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                          "
                        >
                          Duration
                          <SortIcon field="durationMinutes" />
                        </button>
                      </TableHead>

                      <TableHead className="h-11 w-[140px] px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
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
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-md
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

                      <TableHead className="h-11 w-[145px] px-4 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:px-5">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedData.map(
                      (service) => (
                        <TableRow
                          key={service.id}
                          className="
                            border-border
                            transition-colors
                            hover:bg-muted/20
                          "
                        >
                          {/* Service */}
                          <TableCell className="px-4 py-3 lg:px-5">
                            <div className="flex items-center gap-3">
                              <div
                                className="
                                  flex h-9 w-9
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-lg
                                  bg-primary/10
                                  text-primary
                                "
                              >
                                <Cog className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate text-sm font-medium text-foreground">
                                  {service.name}
                                </p>

                                <p className="mt-0.5 max-w-[240px] truncate text-[11px] text-muted-foreground">
                                  {service.description ||
                                    'No description provided'}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Type */}
                          <TableCell className="px-4 py-3 lg:px-5">
                            {typeBadge(
                              service.type
                            )}
                          </TableCell>

                          {/* Pricing */}
                          <TableCell className="px-4 py-3 lg:px-5">
                            <div className="flex items-center gap-2">
                              <Tag className="h-3.5 w-3.5 text-muted-foreground/70" />

                              <span className="text-sm font-semibold text-foreground">
                                ₱
                                {formatPrice(
                                  service.basePrice
                                )}
                              </span>
                            </div>
                          </TableCell>

                          {/* Duration */}
                          <TableCell className="px-4 py-3 lg:px-5">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />

                              <span className="text-sm text-muted-foreground">
                                {
                                  service.durationMinutes
                                }{' '}
                                minutes
                              </span>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="px-4 py-3 lg:px-5">
                            <Badge
                              variant="outline"
                              className={cn(
                                `
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-full
                                px-2 py-0.5
                                text-[11px]
                                font-semibold
                                `,
                                service.active
                                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-destructive/20 bg-destructive/10 text-destructive'
                              )}
                            >
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full',
                                  service.active
                                    ? 'bg-emerald-500'
                                    : 'bg-destructive'
                                )}
                              />

                              {service.active
                                ? 'Active'
                                : 'Disabled'}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="px-4 py-3 lg:px-5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingService(
                                    service
                                  );
                                  setModalOpen(
                                    true
                                  );
                                }}
                                aria-label={`Edit ${service.name}`}
                                className="
                                  h-8
                                  rounded-md
                                  px-2.5
                                  text-xs
                                  focus-visible:outline-none
                                  focus-visible:ring-2
                                  focus-visible:ring-ring
                                  focus-visible:ring-offset-2
                                "
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>

                              {service.active ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setDeactivateDialog(
                                      {
                                        open: true,
                                        id: service.id,
                                        name: service.name,
                                      }
                                    )
                                  }
                                  aria-label={`Disable ${service.name}`}
                                  className="
                                    h-8 w-8
                                    rounded-md
                                    text-amber-600
                                    hover:bg-amber-500/10
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-ring
                                    focus-visible:ring-offset-2
                                  "
                                >
                                  <PowerOff className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setEnableDialog(
                                      {
                                        open: true,
                                        id: service.id,
                                        name: service.name,
                                      }
                                    )
                                  }
                                  aria-label={`Enable ${service.name}`}
                                  className="
                                    h-8 w-8
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
                                  <CheckCircle2 className="h-4 w-4" />
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

            {/* ========================================================
                PAGINATION
                ======================================================== */}
            <div
              className="
                flex flex-col
                gap-3
                border-t border-border
                bg-muted/20
                px-4 py-3
                sm:flex-row
                sm:items-center
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
                    {paginatedData.length}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-foreground">
                    {filteredServices.length}
                  </span>{' '}
                  services
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
                      (page) =>
                        Math.max(
                          1,
                          page - 1
                        )
                    )
                  }
                  aria-label="Previous page"
                  className="
                    h-9 w-9
                    rounded-md
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
                  }).map(
                    (_, index) => {
                      const page =
                        index + 1;

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
                            h-8 w-8
                            rounded-md
                            text-xs
                            font-medium
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                          "
                        >
                          {page}
                        </Button>
                      );
                    }
                  )}
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
                      (page) =>
                        Math.min(
                          Math.max(
                            totalPages,
                            1
                          ),
                          page + 1
                        )
                    )
                  }
                  aria-label="Next page"
                  className="
                    h-9 w-9
                    rounded-md
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
          MODALS
          ================================================================ */}
      <ServiceFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingService={editingService}
        onSuccess={() => {
          setModalOpen(false);
          loadServices();
        }}
      />

      <ServiceDialogs
        deactivateDialog={
          deactivateDialog
        }
        enableDialog={enableDialog}
        onDeactivate={handleDisable}
        onEnable={handleEnable}
        setDeactivateDialog={
          setDeactivateDialog
        }
        setEnableDialog={
          setEnableDialog
        }
      />
    </>
  );
}