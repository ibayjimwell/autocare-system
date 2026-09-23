'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  ShoppingCart,
  AlertTriangle,
  Package,
  Boxes,
  CircleDollarSign,
  TrendingDown,
  ArrowUpRight,
  Pencil,
  RotateCw,
  CircleCheck,
  CircleX,
  ScanLine,
  SlidersHorizontal,
  ArrowDownAZ,
  ArrowUpAZ,
  Barcode,
  Filter,
  History,
  X,
} from 'lucide-react';

import InventoryCard from './inventory-card';
import InventoryForm from './inventory-form';
import RestockModal from './restock-modal';
import POSModal from './pos-modal';
import BarcodeScannerModal from './barcode-scanner-modal';
import BarcodeNotFoundModal from './barcode-not-found-modal';
import LowStockAlertModal from './low-stock-alert-modal';
import PosHistoryModal from './pos-history-modal';

import { useInventory } from '@/hooks/inventory/use-inventory';
import { inventoryApi } from '@/lib/inventory/inventory';
import {
  formatCurrency,
  getInventoryMargin,
  getInventoryStockValue,
  isLowStock,
  isOutOfStock,
} from '@/app-utils/inventory/inventory';

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

type QuickFilter = 'ALL' | 'LOW' | 'OUT';
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type AlertFilter = 'ALL' | 'ENABLED' | 'DISABLED';
type SortKey =
  | 'name'
  | 'quantity'
  | 'costPrice'
  | 'sellingPrice'
  | 'margin'
  | 'stockValue'
  | 'reorderLevel'
  | 'barcode'
  | 'createdAt'
  | 'updatedAt';

function compareText(left: unknown, right: unknown) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareNumber(left: unknown, right: unknown) {
  const a = Number(left) || 0;
  const b = Number(right) || 0;
  return a - b;
}

export default function InventoryList() {
  const {
    items,
    loading,
    error,
    loadItems,
    search,
    setSearch,
    lowStockItems,
    lowStockCount,
    lowStockAlertItem,
    setLowStockAlertItem,
    dismissLowStockAlert,
  } = useInventory(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [restockTarget, setRestockTarget] = useState<any>(null);
  const [posOpen, setPosOpen] = useState(false);
  const [posHistoryOpen, setPosHistoryOpen] = useState(false);

  const [addBarcodeScannerOpen, setAddBarcodeScannerOpen] = useState(false);
  const [restockBarcodeScannerOpen, setRestockBarcodeScannerOpen] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState<string | null>(null);
  const [initialBarcode, setInitialBarcode] = useState('');

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('ALL');
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [minQuantity, setMinQuantity] = useState('');
  const [maxQuantity, setMaxQuantity] = useState('');
  const [minCost, setMinCost] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [minSelling, setMinSelling] = useState('');
  const [maxSelling, setMaxSelling] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const itemsPerPage = 10;

  const units = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => String(item?.unit ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [items]);

  const handleSaveSuccess = () => {
    setFormOpen(false);
    setEditing(null);
    void loadItems();
  };

  const metrics = useMemo(() => {
    const totalItems = items.length;

    const totalValue = items.reduce((sum, item) => {
      return sum + getInventoryStockValue(item);
    }, 0);

    const activeItems = items.filter((item) => item.active).length;
    const outOfStockCount = items.filter((item) => isOutOfStock(item)).length;
    const healthyCount = items.filter(
      (item) =>
        Number(item.quantity) > Number(item.reorderLevel || 0),
    ).length;

    return {
      totalItems,
      totalValue,
      activeItems,
      lowStockCount,
      outOfStockCount,
      healthyCount,
    };
  }, [items, lowStockCount]);

  const stockHealth = useMemo(() => {
    if (metrics.totalItems === 0) {
      return { healthy: 0, low: 0, out: 0 };
    }

    const lowOnly = Math.max(
      metrics.lowStockCount - metrics.outOfStockCount,
      0,
    );

    return {
      healthy: Math.round((metrics.healthyCount / metrics.totalItems) * 100),
      low: Math.round((lowOnly / metrics.totalItems) * 100),
      out: Math.round((metrics.outOfStockCount / metrics.totalItems) * 100),
    };
  }, [metrics]);

  const filteredAndSortedItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const parsedMinQuantity = minQuantity.trim() === '' ? null : Number(minQuantity);
    const parsedMaxQuantity = maxQuantity.trim() === '' ? null : Number(maxQuantity);
    const parsedMinCost = minCost.trim() === '' ? null : Number(minCost);
    const parsedMaxCost = maxCost.trim() === '' ? null : Number(maxCost);
    const parsedMinSelling = minSelling.trim() === '' ? null : Number(minSelling);
    const parsedMaxSelling = maxSelling.trim() === '' ? null : Number(maxSelling);

    const result = items.filter((item) => {
      const itemQuantity = Number(item?.quantity) || 0;
      const itemCost = Number(item?.costPrice) || 0;
      const itemSelling = Number(item?.sellingPrice) || 0;

      if (query) {
        const haystack = [
          item?.name,
          item?.description,
          item?.barcode,
          item?.unit,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      if (quickFilter === 'LOW' && !isLowStock(item)) return false;
      if (quickFilter === 'OUT' && !isOutOfStock(item)) return false;

      if (activeFilter === 'ACTIVE' && item?.active === false) return false;
      if (activeFilter === 'INACTIVE' && item?.active !== false) return false;

      if (alertFilter === 'ENABLED' && item?.lowStockAlert === false) return false;
      if (alertFilter === 'DISABLED' && item?.lowStockAlert !== false) return false;

      if (unitFilter !== 'ALL' && String(item?.unit ?? '') !== unitFilter) {
        return false;
      }

      if (parsedMinQuantity !== null && Number.isFinite(parsedMinQuantity) && itemQuantity < parsedMinQuantity) {
        return false;
      }

      if (parsedMaxQuantity !== null && Number.isFinite(parsedMaxQuantity) && itemQuantity > parsedMaxQuantity) {
        return false;
      }

      if (parsedMinCost !== null && Number.isFinite(parsedMinCost) && itemCost < parsedMinCost) {
        return false;
      }

      if (parsedMaxCost !== null && Number.isFinite(parsedMaxCost) && itemCost > parsedMaxCost) {
        return false;
      }

      if (parsedMinSelling !== null && Number.isFinite(parsedMinSelling) && itemSelling < parsedMinSelling) {
        return false;
      }

      if (parsedMaxSelling !== null && Number.isFinite(parsedMaxSelling) && itemSelling > parsedMaxSelling) {
        return false;
      }

      if (dateFrom && item?.createdAt) {
        const start = new Date(`${dateFrom}T00:00:00`).getTime();
        const created = new Date(item.createdAt).getTime();
        if (Number.isFinite(start) && Number.isFinite(created) && created < start) return false;
      }

      if (dateTo && item?.createdAt) {
        const end = new Date(`${dateTo}T23:59:59.999`).getTime();
        const created = new Date(item.createdAt).getTime();
        if (Number.isFinite(end) && Number.isFinite(created) && created > end) return false;
      }

      return true;
    });

    result.sort((left, right) => {
      let comparison = 0;

      switch (sortKey) {
        case 'name':
          comparison = compareText(left?.name, right?.name);
          break;
        case 'quantity':
          comparison = compareNumber(left?.quantity, right?.quantity);
          break;
        case 'costPrice':
          comparison = compareNumber(left?.costPrice, right?.costPrice);
          break;
        case 'sellingPrice':
          comparison = compareNumber(left?.sellingPrice, right?.sellingPrice);
          break;
        case 'margin':
          comparison = compareNumber(
            getInventoryMargin(left),
            getInventoryMargin(right),
          );
          break;
        case 'stockValue':
          comparison = compareNumber(
            getInventoryStockValue(left),
            getInventoryStockValue(right),
          );
          break;
        case 'reorderLevel':
          comparison = compareNumber(left?.reorderLevel, right?.reorderLevel);
          break;
        case 'barcode':
          comparison = compareText(left?.barcode, right?.barcode);
          break;
        case 'createdAt':
          comparison = compareNumber(
            new Date(left?.createdAt ?? 0).getTime(),
            new Date(right?.createdAt ?? 0).getTime(),
          );
          break;
        case 'updatedAt':
          comparison = compareNumber(
            new Date(left?.updatedAt ?? 0).getTime(),
            new Date(right?.updatedAt ?? 0).getTime(),
          );
          break;
        default:
          comparison = 0;
      }

      if (comparison === 0) {
        comparison = compareText(left?.id, right?.id);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [
    items,
    search,
    quickFilter,
    activeFilter,
    alertFilter,
    unitFilter,
    minQuantity,
    maxQuantity,
    minCost,
    maxCost,
    minSelling,
    maxSelling,
    dateFrom,
    dateTo,
    sortKey,
    sortDirection,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedItems.length / itemsPerPage),
  );

  const visibleItems = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(start, start + itemsPerPage);
  }, [filteredAndSortedItems, page, totalPages]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  React.useEffect(() => {
    setPage(1);
  }, [
    search,
    quickFilter,
    activeFilter,
    alertFilter,
    unitFilter,
    minQuantity,
    maxQuantity,
    minCost,
    maxCost,
    minSelling,
    maxSelling,
    dateFrom,
    dateTo,
    sortKey,
    sortDirection,
  ]);

  const clearFilters = () => {
    setSearch('');
    setQuickFilter('ALL');
    setActiveFilter('ALL');
    setAlertFilter('ALL');
    setUnitFilter('ALL');
    setMinQuantity('');
    setMaxQuantity('');
    setMinCost('');
    setMaxCost('');
    setMinSelling('');
    setMaxSelling('');
    setDateFrom('');
    setDateTo('');
    setSortKey('name');
    setSortDirection('asc');
  };

  const hasAdvancedFilters =
    activeFilter !== 'ALL' ||
    alertFilter !== 'ALL' ||
    unitFilter !== 'ALL' ||
    minQuantity !== '' ||
    maxQuantity !== '' ||
    minCost !== '' ||
    maxCost !== '' ||
    minSelling !== '' ||
    maxSelling !== '' ||
    dateFrom !== '' ||
    dateTo !== '';

  const handleAddBarcodeDetected = async (barcode: string) => {
    setAddBarcodeScannerOpen(false);

    const normalized = barcode.trim();
    if (!normalized) return;

    try {
      const result = await inventoryApi.lookupBarcode(normalized);

      if (!result?.error && result?.data) {
        toast.info('This barcode already exists. Opening the existing item for editing.');
        setEditing(result.data);
        setInitialBarcode('');
        setFormOpen(true);
        return;
      }
    } catch (error) {
      console.error('[InventoryList] Add barcode lookup:', error);
    }

    setEditing(null);
    setInitialBarcode(normalized);
    setFormOpen(true);
  };

  const handleRestockBarcodeDetected = async (barcode: string) => {
    setRestockBarcodeScannerOpen(false);

    const normalized = barcode.trim();
    if (!normalized) return;

    try {
      const result = await inventoryApi.lookupBarcode(normalized);

      if (!result?.error && result?.data) {
        setRestockTarget(result.data);
        return;
      }
    } catch (error) {
      console.error('[InventoryList] Restock barcode lookup:', error);
    }

    setBarcodeNotFound(normalized);
  };

  const openAddManual = () => {
    setBarcodeNotFound(null);
    setEditing(null);
    setInitialBarcode('');
    setFormOpen(true);
  };

  const openAddWithBarcode = () => {
    const barcode = barcodeNotFound || '';
    setBarcodeNotFound(null);
    setEditing(null);
    setInitialBarcode(barcode);
    setFormOpen(true);
  };

  return (
    <>
      <div className="space-y-5 pb-24 lg:space-y-6 lg:pb-0">
        {/* Page summary */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="grid divide-y divide-border md:grid-cols-[1.1fr_1fr] md:divide-x md:divide-y-0">
            <div className="p-5 sm:p-6 lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total inventory value
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    ₱{formatCurrency(metrics.totalValue)}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                    Based on current stock × cost price
                  </div>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-primary sm:h-11 sm:w-11">
                  <CircleDollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Stock overview
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {metrics.totalItems}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      products
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-right">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Active
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {metrics.activeItems}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Low Stock
                    </p>
                    <p className="text-sm font-semibold text-red-600">
                      {metrics.lowStockCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${Math.max(stockHealth.healthy, 0)}%` }}
                  />
                  <div
                    className="bg-amber-500 transition-all"
                    style={{ width: `${Math.max(Math.min(stockHealth.low, 100), 0)}%` }}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${Math.max(Math.min(stockHealth.out, 100), 0)}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Healthy {metrics.healthyCount}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Low stock {Math.max(metrics.lowStockCount - metrics.outOfStockCount, 0)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Out of stock {metrics.outOfStockCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Inventory
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Parts & supplies
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {filteredAndSortedItems.length}
              </span>
              {lowStockCount > 0 ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                  {lowStockCount} low stock
                </span>
              ) : null}
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPosHistoryOpen(true)}
              className={`h-9 rounded-md px-3 text-xs font-medium ${focusClass}`}
            >
              <History className="mr-1.5 h-4 w-4" />
              Transaction History
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPosOpen(true)}
              className={`h-9 rounded-md px-3 text-xs font-medium ${focusClass}`}
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              POS
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddBarcodeScannerOpen(true)}
              className={`h-9 rounded-md px-3 text-xs font-medium ${focusClass}`}
            >
              <Barcode className="mr-1.5 h-4 w-4" />
              Add by Barcode
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRestockBarcodeScannerOpen(true)}
              className={`h-9 rounded-md px-3 text-xs font-medium ${focusClass}`}
            >
              <ScanLine className="mr-1.5 h-4 w-4" />
              Restock by Barcode
            </Button>

            <Button
              onClick={() => {
                setEditing(null);
                setInitialBarcode('');
                setFormOpen(true);
              }}
              size="sm"
              className={`h-9 rounded-md px-3 text-xs font-medium ${focusClass}`}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Search / filters / sorting */}
        <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1 lg:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, description, barcode, or unit..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 rounded-md border-input bg-background pl-10 text-base md:h-9 md:text-sm"
                />
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto lg:flex-none">
                <Button
                  type="button"
                  variant={quickFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setQuickFilter('ALL')}
                  className={`h-11 shrink-0 rounded-md px-3 text-xs md:h-9 ${focusClass}`}
                >
                  <Boxes className="mr-1.5 h-4 w-4" />
                  All items
                </Button>

                <Button
                  type="button"
                  variant={quickFilter === 'LOW' ? 'default' : 'outline'}
                  onClick={() => setQuickFilter('LOW')}
                  disabled={lowStockCount === 0}
                  className={`h-11 shrink-0 rounded-md px-3 text-xs md:h-9 ${focusClass}`}
                >
                  <TrendingDown className="mr-1.5 h-4 w-4" />
                  Low stock ({lowStockCount})
                </Button>

                <Button
                  type="button"
                  variant={quickFilter === 'OUT' ? 'default' : 'outline'}
                  onClick={() => setQuickFilter('OUT')}
                  disabled={metrics.outOfStockCount === 0}
                  className={`h-11 shrink-0 rounded-md px-3 text-xs md:h-9 ${focusClass}`}
                >
                  <AlertTriangle className="mr-1.5 h-4 w-4" />
                  Out of stock ({metrics.outOfStockCount})
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                  <SelectTrigger className="h-11 w-full rounded-md text-base md:h-9 md:w-[190px] md:text-sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4 shrink-0" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="quantity">Quantity</SelectItem>
                    <SelectItem value="costPrice">Cost price</SelectItem>
                    <SelectItem value="sellingPrice">Selling price</SelectItem>
                    <SelectItem value="margin">Unit margin</SelectItem>
                    <SelectItem value="stockValue">Stock value</SelectItem>
                    <SelectItem value="reorderLevel">Reorder level</SelectItem>
                    <SelectItem value="barcode">Barcode</SelectItem>
                    <SelectItem value="createdAt">Date added</SelectItem>
                    <SelectItem value="updatedAt">Last updated</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}
                  className={`h-11 rounded-md px-3 text-xs md:h-9 ${focusClass}`}
                  title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortDirection === 'asc' ? (
                    <ArrowDownAZ className="mr-1.5 h-4 w-4" />
                  ) : (
                    <ArrowUpAZ className="mr-1.5 h-4 w-4" />
                  )}
                  {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={hasAdvancedFilters ? 'default' : 'outline'}
                      className={`h-11 rounded-md px-3 text-xs md:h-9 ${focusClass}`}
                    >
                      <Filter className="mr-1.5 h-4 w-4" />
                      Filters
                      {hasAdvancedFilters ? ' (active)' : ''}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="end"
                    className="w-[calc(100vw-2rem)] max-w-xl rounded-lg border border-border bg-popover p-0 shadow-lg"
                  >
                    <div className="border-b border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Inventory filters
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Narrow the inventory list by operational stock and pricing criteria.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setFilterOpen(false)}
                          className="h-9 w-9 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-[65vh] overflow-y-auto p-4 [scrollbar-gutter:stable]">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Active status</Label>
                          <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as ActiveFilter)}>
                            <SelectTrigger className="h-11 text-base md:h-9 md:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All items</SelectItem>
                              <SelectItem value="ACTIVE">Active only</SelectItem>
                              <SelectItem value="INACTIVE">Inactive only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Low-stock alert</Label>
                          <Select value={alertFilter} onValueChange={(value) => setAlertFilter(value as AlertFilter)}>
                            <SelectTrigger className="h-11 text-base md:h-9 md:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All items</SelectItem>
                              <SelectItem value="ENABLED">Alerts enabled</SelectItem>
                              <SelectItem value="DISABLED">Alerts disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                          <Label>Unit</Label>
                          <Select value={unitFilter} onValueChange={setUnitFilter}>
                            <SelectTrigger className="h-11 text-base md:h-9 md:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All units</SelectItem>
                              {units.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity minimum</Label>
                          <Input
                            type="number"
                            min={0}
                            value={minQuantity}
                            onChange={(e) => setMinQuantity(e.target.value)}
                            placeholder="0"
                            className="h-11 text-base md:h-9 md:text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity maximum</Label>
                          <Input
                            type="number"
                            min={0}
                            value={maxQuantity}
                            onChange={(e) => setMaxQuantity(e.target.value)}
                            placeholder="Any"
                            className="h-11 text-base md:h-9 md:text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Cost minimum (₱)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={minCost}
                            onChange={(e) => setMinCost(e.target.value)}
                            placeholder="0.00"
                            className="h-11 text-base md:h-9 md:text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Cost maximum (₱)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={maxCost}
                            onChange={(e) => setMaxCost(e.target.value)}
                            placeholder="Any"
                            className="h-11 text-base md:h-9 md:text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Selling minimum (₱)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={minSelling}
                            onChange={(e) => setMinSelling(e.target.value)}
                            placeholder="0.00"
                            className="h-11 text-base md:h-9 md:text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Selling maximum (₱)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={maxSelling}
                            onChange={(e) => setMaxSelling(e.target.value)}
                            placeholder="Any"
                            className="h-11 text-base md:h-9 md:text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Added from</Label>
                          <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-11 text-base md:h-9 md:text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Added to</Label>
                          <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-11 text-base md:h-9 md:text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/20 p-4 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearFilters}
                        className={`h-11 rounded-md sm:h-9 ${focusClass}`}
                      >
                        Clear filters
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setFilterOpen(false)}
                        className={`h-11 rounded-md sm:h-9 ${focusClass}`}
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!search && quickFilter === 'ALL' && !hasAdvancedFilters && sortKey === 'name' && sortDirection === 'asc'}
                  className={`h-11 rounded-md px-3 text-xs md:h-9 ${focusClass}`}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </section>

        {/* Desktop table */}
        <section className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/35">
                  <th className="w-12 px-4 py-3 text-left" />
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Item</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Barcode</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quantity</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cost</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selling</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Margin</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="w-[180px] px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr key={index} className="border-b border-border last:border-b-0">
                      {Array.from({ length: 9 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-4">
                          <div className="h-4 w-full max-w-24 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-base font-semibold text-foreground">
                          No inventory items match
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Try clearing a filter or searching for another product.
                        </p>
                        <Button
                          type="button"
                          onClick={clearFilters}
                          className={`mt-5 h-9 rounded-md px-4 text-sm ${focusClass}`}
                        >
                          Clear filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => {
                    const low = isLowStock(item);
                    const out = isOutOfStock(item);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3.5">
                          <div className={[
                            'flex h-8 w-8 items-center justify-center rounded-lg border',
                            out
                              ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400'
                              : low
                                ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-400'
                                : 'border-border bg-muted/40 text-muted-foreground',
                          ].join(' ')}>
                            {out || low ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Package className="h-4 w-4" />
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="max-w-[250px]">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {item.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {item.description || 'No description provided'}
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          {item.barcode ? (
                            <span className="inline-flex max-w-[150px] items-center gap-1.5 truncate rounded-md bg-muted/50 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                              <Barcode className="h-3 w-3 shrink-0" />
                              <span className="truncate">{item.barcode}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-3 py-3.5">
                          <p className={[
                            'text-sm font-semibold',
                            out ? 'text-red-600' : low ? 'text-amber-700' : 'text-foreground',
                          ].join(' ')}>
                            {item.quantity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.unit || 'unit'}
                          </p>
                        </td>

                        <td className="px-3 py-3.5">
                          <p className="text-sm font-medium text-foreground">
                            ₱{formatCurrency(item.costPrice)}
                          </p>
                        </td>

                        <td className="px-3 py-3.5">
                          <p className="text-sm font-semibold text-primary">
                            ₱{formatCurrency(item.sellingPrice)}
                          </p>
                        </td>

                        <td className="px-3 py-3.5">
                          <p className="text-sm font-medium text-foreground">
                            ₱{formatCurrency(getInventoryMargin(item))}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Stock ₱{formatCurrency(getInventoryStockValue(item))}
                          </p>
                        </td>

                        <td className="px-3 py-3.5">
                          {out ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/30 dark:text-red-400">
                              <CircleX className="h-3 w-3" />
                              Out of stock
                            </span>
                          ) : low ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                              <TrendingDown className="h-3 w-3" />
                              Low stock
                            </span>
                          ) : item.active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              <CircleCheck className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <CircleX className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRestockTarget(item)}
                              className={`h-8 rounded-md px-2.5 text-xs ${focusClass}`}
                            >
                              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                              Restock
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditing(item);
                                setInitialBarcode('');
                                setFormOpen(true);
                              }}
                              className={`h-8 rounded-md px-2.5 text-xs ${focusClass}`}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredAndSortedItems.length > 0 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {Math.min((page - 1) * itemsPerPage + 1, filteredAndSortedItems.length)}–{Math.min(page * itemsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="h-8 rounded-md px-3 text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="h-8 rounded-md px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        {/* Tablet/mobile cards */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-xl border border-border bg-muted/40"
              />
            ))
          ) : visibleItems.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No inventory items match
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Try clearing a filter or searching for another product.
              </p>
              <Button
                type="button"
                onClick={clearFilters}
                className={`mt-5 h-11 rounded-md px-4 text-sm md:h-9 ${focusClass}`}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            visibleItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onEdit={() => {
                  setEditing(item);
                  setInitialBarcode('');
                  setFormOpen(true);
                }}
                onRestock={() => setRestockTarget(item)}
              />
            ))
          )}

          {!loading && filteredAndSortedItems.length > 0 ? (
            <div className="col-span-full flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="h-10 rounded-md px-3 text-xs"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="h-10 rounded-md px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/80 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPosOpen(true)}
            className="h-11 rounded-md bg-card text-sm font-medium shadow-sm"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            POS
          </Button>

          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setInitialBarcode('');
              setFormOpen(true);
            }}
            className="h-11 rounded-md text-sm font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="mx-auto mt-2 grid max-w-3xl grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setAddBarcodeScannerOpen(true)}
            className="h-10 rounded-md bg-card px-2 text-xs"
          >
            <Barcode className="mr-1.5 h-3.5 w-3.5" />
            Add by Barcode
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRestockBarcodeScannerOpen(true)}
            className="h-10 rounded-md bg-card px-2 text-xs"
          >
            <ScanLine className="mr-1.5 h-3.5 w-3.5" />
            Restock Scan
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPosHistoryOpen(true)}
            className="h-10 rounded-md bg-card px-2 text-xs"
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            History
          </Button>
        </div>
      </div>

      <InventoryForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setInitialBarcode('');
        }}
        item={editing}
        initialBarcode={initialBarcode}
        onSuccess={handleSaveSuccess}
      />

      <RestockModal
        item={restockTarget}
        onClose={() => setRestockTarget(null)}
        onSuccess={() => void loadItems()}
      />

      <POSModal
        open={posOpen}
        onClose={() => setPosOpen(false)}
        onCompleted={() => void loadItems()}
      />

      <PosHistoryModal
        open={posHistoryOpen}
        onClose={() => setPosHistoryOpen(false)}
      />

      <BarcodeScannerModal
        open={addBarcodeScannerOpen}
        onOpenChange={setAddBarcodeScannerOpen}
        onDetected={handleAddBarcodeDetected}
        title="Add Item by Barcode"
        description="Scan an item barcode. Existing inventory details will be filled automatically when the barcode is already registered."
      />

      <BarcodeScannerModal
        open={restockBarcodeScannerOpen}
        onOpenChange={setRestockBarcodeScannerOpen}
        onDetected={handleRestockBarcodeDetected}
        title="Restock Item by Barcode"
        description="Scan a product barcode to find the matching inventory item and open its restock form."
      />

      <BarcodeNotFoundModal
        open={Boolean(barcodeNotFound)}
        barcode={barcodeNotFound || ''}
        onOpenChange={(open) => {
          if (!open) setBarcodeNotFound(null);
        }}
        onAddManual={openAddManual}
        onAddWithBarcode={openAddWithBarcode}
      />

      <LowStockAlertModal
        item={lowStockAlertItem}
        lowStockCount={lowStockCount}
        onOpenChange={(open) => {
          if (!open) dismissLowStockAlert();
        }}
        onRestock={(item) => setRestockTarget(item)}
        onEdit={(item) => {
          setEditing(item);
          setInitialBarcode('');
          setFormOpen(true);
        }}
      />
    </>
  );
}
