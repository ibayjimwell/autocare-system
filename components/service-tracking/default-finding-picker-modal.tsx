'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckCheck,
  ClipboardCheck,
  Loader2,
  Package,
  Search,
} from 'lucide-react';
import { defaultFindingsApi } from '@/lib/service-tracking/default-findings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface DefaultFindingSelection {
  description: string;
  parts: Array<{
    inventoryItemId?: string | null;
    partName: string;
    quantity: number;
    priceAtTime: number;
    isPms: boolean;
  }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFindings: (findings: DefaultFindingSelection[]) => Promise<void>;
  isAdding: boolean;
}

export default function DefaultFindingPickerModal({
  open,
  onOpenChange,
  onAddFindings,
  isAdding,
}: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearch('');
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await defaultFindingsApi.list();
        if (cancelled) return;

        if (response?.error) {
          throw new Error(
            response.errorMessage || 'Failed to load default findings.',
          );
        }

        setItems(Array.isArray(response?.data) ? response.data : []);
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error?.message || 'Failed to load default findings.');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((finding) =>
      [
        finding?.title,
        ...(finding?.parts || []).map((part: any) => part?.partName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [items, search]);

  const toggle = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const finding of visible) next.add(finding.id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const add = async () => {
    if (selected.size === 0 || isAdding) return;

    // Use the entire catalog rather than just filtered results. Selections
    // remain intact even when staff search for additional findings.
    const chosen: DefaultFindingSelection[] = items
      .filter((finding) => selected.has(finding.id))
      .map((finding) => ({
        description: String(finding.title || ''),
        parts: (finding.parts || []).map((part: any) => ({
          inventoryItemId: part.inventoryItemId || null,
          partName: String(part.partName || ''),
          quantity: Math.max(1, Number(part.quantity) || 1),
          priceAtTime: Boolean(part.isPms)
            ? 0
            : Math.max(0, Number(part.priceAtTime) || 0),
          isPms: Boolean(part.isPms),
        })),
      }));

    if (!chosen.length) return;
    await onAddFindings(chosen);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isAdding) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="
          !flex
          !h-[min(90dvh,840px)]
          !max-h-[90dvh]
          !w-[calc(100vw-1rem)]
          !max-w-[1240px]
          sm:!w-[calc(100vw-2rem)]
          lg:!w-[92vw]
          !flex-col
          !gap-0
          !overflow-hidden
          !rounded-2xl
          !border-border
          !bg-card
          !p-0
          !shadow-2xl
        "
      >
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Add Default Findings
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5 sm:text-sm">
                Choose one or more reusable findings and their attached parts
                for this service appointment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search / selection toolbar */}
        <div className="shrink-0 space-y-3 border-b border-border bg-muted/20 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search findings or attached parts..."
                className="h-11 rounded-md pl-10 md:h-9"
                aria-label="Search default findings"
              />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge variant="secondary" className="h-8 rounded-md px-3 text-xs">
                {visible.length} shown
              </Badge>
              <Badge variant="outline" className="h-8 rounded-md px-3 text-xs">
                {selected.size} selected
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Selected findings remain checked while you search.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={selectAllVisible}
                disabled={isAdding || loading || visible.length === 0}
                className="h-9"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Select Shown
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                disabled={isAdding || selected.size === 0}
                className="h-9"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>

        {/* Wide responsive finding grid */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-background/60 p-3 sm:p-4 lg:p-6">
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 text-center">
              <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                No default findings found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a finding in the library or try another search.
              </p>
            </div>
          ) : (
            <div className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((finding) => {
                const checked = selected.has(finding.id);
                const parts = Array.isArray(finding.parts) ? finding.parts : [];

                return (
                  <div
                    key={finding.id}
                    className={cn(
                      'min-w-0 rounded-xl border bg-card transition-colors',
                      checked
                        ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/15'
                        : 'border-border hover:border-primary/30 hover:bg-muted/20',
                    )}
                  >
                    <label
                      htmlFor={`pick-default-finding-${finding.id}`}
                      className="flex cursor-pointer items-start gap-3 px-4 py-4"
                    >
                      <Checkbox
                        id={`pick-default-finding-${finding.id}`}
                        checked={checked}
                        onCheckedChange={() => toggle(finding.id)}
                        disabled={isAdding}
                        className="mt-0.5 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-semibold leading-5 text-foreground">
                          {finding.title}
                        </span>
                        <span className="mt-2 block text-xs text-muted-foreground">
                          {parts.length} attached part{parts.length === 1 ? '' : 's'}
                        </span>
                      </span>
                    </label>

                    {parts.length > 0 && (
                      <div className="border-t border-border px-4 py-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Parts included
                        </p>
                        <div className="space-y-2">
                          {parts.map((part: any, index: number) => (
                            <div
                              key={part.id || `${finding.id}-part-${index}`}
                              className="flex min-w-0 items-start gap-2 text-xs text-muted-foreground"
                            >
                              <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
                              <div className="min-w-0 flex-1">
                                <p className="break-words leading-5">
                                  {part.partName} × {part.quantity}
                                </p>
                                {part.inventoryItemId && (
                                  <p className="text-[10px] text-primary">
                                    Inventory linked
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            disabled={isAdding}
            onClick={() => onOpenChange(false)}
            className="h-11 w-full sm:w-auto md:h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selected.size === 0 || isAdding || loading}
            onClick={() => void add()}
            className="h-11 w-full sm:w-auto md:h-9"
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selected.size || ''} Finding${selected.size === 1 ? '' : 's'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
