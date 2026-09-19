'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDown,
  ArrowUp,
  Filter,
  Search,
  X,
} from 'lucide-react';
import type {
  PaymentSearchField,
  PaymentSortDirection,
  PaymentSortKey,
} from '@/hooks/payments/usePaymentsData';

interface FilterBarProps {
  activeTab: 'estimates' | 'final-bills';
  statusFilter: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchField: PaymentSearchField;
  onSearchFieldChange: (value: PaymentSearchField) => void;
  sortBy: PaymentSortKey;
  onSortByChange: (value: PaymentSortKey) => void;
  sortDirection: PaymentSortDirection;
  onSortDirectionChange: (value: PaymentSortDirection) => void;
  onClear: () => void;
}

const ESTIMATE_STATUSES = [
  ['ALL', 'All statuses'],
  ['PENDING', 'Pending'],
  ['WAITING_FOR_APPROVAL', 'Waiting for approval'],
  ['APPROVED', 'Approved'],
  ['DECLINED', 'Declined'],
] as const;

const FINAL_BILL_STATUSES = [
  ['ALL', 'All statuses'],
  ['PENDING', 'Pending'],
  ['PARKED', 'Parked'],
  ['OFFICIAL', 'Official'],
  ['PAID', 'Paid'],
] as const;

const SEARCH_FIELDS: [PaymentSearchField, string][] = [
  ['ALL', 'Everything'],
  ['RECORD_ID', 'Record ID'],
  ['CUSTOMER', 'Customer'],
  ['PLATE', 'Vehicle Plate'],
  ['TRACKING_NUMBER', 'Tracking Number'],
];

const SORT_OPTIONS: [PaymentSortKey, string][] = [
  ['date', 'Date'],
  ['total', 'Total Amount'],
  ['customer', 'Customer'],
  ['plate', 'Vehicle Plate'],
  ['trackingNumber', 'Tracking Number'],
  ['recordId', 'Record ID'],
];

export default function FilterBar({
  activeTab,
  statusFilter,
  onStatusChange,
  search,
  onSearchChange,
  searchField,
  onSearchFieldChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  onClear,
}: FilterBarProps) {
  const statuses = activeTab === 'final-bills'
    ? FINAL_BILL_STATUSES
    : ESTIMATE_STATUSES;

  const hasFilters =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    searchField !== 'ALL' ||
    sortBy !== 'date' ||
    sortDirection !== 'desc';

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 p-3 md:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="payments-search" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="payments-search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search payments..."
                className="h-10 rounded-md pl-9 pr-3"
              />
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Clear search"
                  onClick={() => onSearchChange('')}
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="w-full xl:w-44 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Search Field
            </Label>
            <Select value={searchField} onValueChange={(value) => onSearchFieldChange(value as PaymentSearchField)}>
              <SelectTrigger className="h-10 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_FIELDS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full xl:w-44 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="h-10 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full xl:w-44 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sort By
            </Label>
            <Select value={sortBy} onValueChange={(value) => onSortByChange(value as PaymentSortKey)}>
              <SelectTrigger className="h-10 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="h-10 w-full rounded-md xl:w-auto"
            aria-label={sortDirection === 'asc' ? 'Sort descending' : 'Sort ascending'}
          >
            {sortDirection === 'asc' ? (
              <ArrowUp className="mr-2 h-4 w-4" />
            ) : (
              <ArrowDown className="mr-2 h-4 w-4" />
            )}
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </Button>

          <Button
            type="button"
            variant={hasFilters ? 'default' : 'outline'}
            onClick={onClear}
            className="h-10 w-full rounded-md xl:w-auto"
            disabled={!hasFilters}
          >
            <Filter className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active
            </span>
            {search && <Badge variant="secondary" className="rounded-full text-[10px]">Search: {search}</Badge>}
            {statusFilter !== 'ALL' && <Badge variant="secondary" className="rounded-full text-[10px]">Status: {statusFilter.replace(/_/g, ' ')}</Badge>}
            {searchField !== 'ALL' && <Badge variant="secondary" className="rounded-full text-[10px]">Field: {SEARCH_FIELDS.find(([value]) => value === searchField)?.[1]}</Badge>}
            {sortBy !== 'date' && <Badge variant="secondary" className="rounded-full text-[10px]">Sort: {SORT_OPTIONS.find(([value]) => value === sortBy)?.[1]}</Badge>}
          </div>
        )}
      </div>
    </section>
  );
}
