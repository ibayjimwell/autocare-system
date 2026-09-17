'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CalendarDays,
  Car,
  Check,
  FileText,
  Loader2,
  Search,
  User,
  Wrench,
} from 'lucide-react';
import { useHistoryFindings } from '@/hooks/service-tracking/useHistoryFindings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ================================================================
   TYPES
================================================================ */

interface HistoryFindingPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFindings: (
    findings: Array<{
      description: string;
      parts: Array<{
        partName: string;
        quantity: number;
        priceAtTime: number;
        isPms: boolean;
      }>;
    }>,
  ) => Promise<void>;
  isAdding: boolean;
  phase: 'INSPECTION';
  excludeAppointmentId?: string;
}

/* ================================================================
   COMPONENT
================================================================ */

export default function HistoryFindingPickerModal({
  open,
  onOpenChange,
  onAddFindings,
  isAdding,
  phase,
  excludeAppointmentId,
}: HistoryFindingPickerModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    findings,
    loading,
    refreshing,
  } = useHistoryFindings(
    search,
    phase,
    {
      enabled: open,
      excludeAppointmentId,
      debounceMs: 250,
    },
  );

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIds(new Set());
      return;
    }

  }, [open]);

  /* ==============================================================
     DEDUPLICATE IDENTICAL FINDINGS

     Historical data can legitimately contain repeated findings for
     different appointments. For a reuse picker, showing the latest
     occurrence of each identical description is more useful and
     avoids accidentally adding the same observation multiple times.
  ============================================================== */

  const uniqueFindings = useMemo(() => {
    const seen = new Set<string>();

    return findings.filter((finding: any) => {
      const key = String(
        finding?.description || '',
      )
        .trim()
        .toLowerCase();

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [findings]);

  /* ==============================================================
     TOGGLE
  ============================================================== */

  const handleToggle = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  /* ==============================================================
     SELECT ALL
  ============================================================== */

  const allVisibleSelected =
    uniqueFindings.length > 0 &&
    uniqueFindings.every((finding: any) =>
      selectedIds.has(finding.id),
    );

  const handleSelectAll = () => {
    if (uniqueFindings.length === 0) {
      return;
    }

    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (allVisibleSelected) {
        uniqueFindings.forEach((finding: any) =>
          next.delete(finding.id),
        );
      } else {
        uniqueFindings.forEach((finding: any) =>
          next.add(finding.id),
        );
      }

      return next;
    });
  };

  /* ==============================================================
     ADD SELECTED
  ============================================================== */

  const handleAddSelected = async () => {
    const selected = uniqueFindings.filter((finding: any) =>
      selectedIds.has(finding.id),
    );

    if (selected.length === 0) {
      toast.warning(
        'Select at least one historical finding.',
      );
      return;
    }

    const findingsToAdd = selected
      .map((finding: any) => ({
        description: String(
          finding?.description || '',
        ).trim(),

        parts: Array.isArray(finding?.parts)
          ? finding.parts
              .map((part: any) => ({
                partName: String(
                  part?.partName || 'Part',
                ).trim(),
                quantity: Math.max(
                  1,
                  Number(part?.quantity) || 1,
                ),
                priceAtTime: Math.max(
                  0,
                  Number(part?.priceAtTime) || 0,
                ),
                isPms: Boolean(part?.isPms),
              }))
              .filter(
                (part: any) =>
                  part.partName.length > 0,
              )
          : [],
      }))
      .filter(
        (finding) =>
          finding.description.length > 0,
      );

    if (findingsToAdd.length === 0) {
      toast.error(
        'The selected historical findings are invalid.',
      );
      return;
    }

    await onAddFindings(
      findingsToAdd,
    );

    setSelectedIds(new Set());
  };

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          flex
          h-[92vh]
          w-[calc(100%-1rem)]
          max-w-3xl
          flex-col
          overflow-hidden
          rounded-xl
          border-border
          bg-card
          p-0
          shadow-xl

          sm:max-h-[88vh]
        "
      >
        {/* ========================================================
            HEADER
        ========================================================= */}

        <DialogHeader
          className="
            shrink-0
            border-b
            border-border
            p-4

            sm:p-5
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-md
                bg-primary/10
                text-primary
              "
            >
              <Wrench className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Reuse Finding History
              </DialogTitle>

              <DialogDescription className="mt-1 text-xs leading-5 sm:text-sm">
                Reuse a previous inspection finding and its recorded
                parts for this appointment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================
            SEARCH / SELECTION
        ========================================================= */}

        <div
          className="
            shrink-0
            space-y-3
            border-b
            border-border
            bg-muted/20
            p-3

            sm:p-4
          "
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search finding, customer, vehicle, or tracking number..."
              className="
                h-11
                rounded-md
                pl-10
                text-base

                md:h-9
                md:text-sm
              "
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full text-[10px]"
              >
                {uniqueFindings.length} available
              </Badge>

              {selectedIds.size > 0 && (
                <Badge className="rounded-full text-[10px]">
                  {selectedIds.size} selected
                </Badge>
              )}

              {refreshing && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={uniqueFindings.length === 0}
              className="h-8 rounded-md px-2.5 text-xs"
            >
              {allVisibleSelected
                ? 'Clear visible'
                : 'Select visible'}
            </Button>
          </div>
        </div>

        {/* ========================================================
            CONTENT
        ========================================================= */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
          "
        >
          <div className="space-y-2 p-3 sm:p-4">
            {loading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />

                <p className="mt-3 text-sm font-medium text-foreground">
                  Loading finding history...
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Retrieving previous inspection observations.
                </p>
              </div>
            ) : uniqueFindings.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>

                <p className="mt-3 text-sm font-semibold text-foreground">
                  No reusable findings
                </p>

                <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                  {search.trim()
                    ? 'No historical findings match your search.'
                    : 'Complete previous inspections with findings to build a reusable history library.'}
                </p>
              </div>
            ) : (
              uniqueFindings.map((finding: any) => {
                const selected = selectedIds.has(
                  finding.id,
                );

                const parts = Array.isArray(finding?.parts)
                  ? finding.parts
                  : [];

                return (
                  <label
                    key={finding.id}
                    htmlFor={`history-finding-${finding.id}`}
                    className={cn(
                      'block cursor-pointer overflow-hidden rounded-lg border bg-background transition-colors',
                      selected
                        ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
                        : 'border-border hover:border-primary/20 hover:bg-muted/20',
                    )}
                  >
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`history-finding-${finding.id}`}
                          checked={selected}
                          onCheckedChange={() =>
                            handleToggle(
                              finding.id,
                            )
                          }
                          className="mt-0.5"
                        />

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Previous finding
                              </p>

                              <p className="mt-0.5 whitespace-pre-wrap text-sm font-semibold leading-5 text-foreground">
                                {finding.description}
                              </p>
                            </div>

                            {selected && (
                              <Badge className="shrink-0 rounded-full text-[9px]">
                                <Check className="mr-1 h-3 w-3" />
                                Selected
                              </Badge>
                            )}
                          </div>

                          {/* ======================================
                              SOURCE APPOINTMENT
                          ======================================= */}

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {finding.customer?.fullname && (
                              <div className="flex min-w-0 items-center gap-2">
                                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate text-[10px] text-muted-foreground">
                                  {finding.customer.fullname}
                                </span>
                              </div>
                            )}

                            {finding.vehicle && (
                              <div className="flex min-w-0 items-center gap-2">
                                <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate text-[10px] text-muted-foreground">
                                  {finding.vehicle.make || ''}{' '}
                                  {finding.vehicle.model || ''}{' '}
                                  {finding.vehicle.plateNumber
                                    ? `(${finding.vehicle.plateNumber})`
                                    : ''}
                                </span>
                              </div>
                            )}

                            {finding.appointment?.trackingNumber && (
                              <div className="flex min-w-0 items-center gap-2">
                                <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate font-mono text-[10px] text-muted-foreground">
                                  #{finding.appointment.trackingNumber}
                                </span>
                              </div>
                            )}

                            {finding.recordedAt && (
                              <div className="flex min-w-0 items-center gap-2">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate text-[10px] text-muted-foreground">
                                  {new Date(
                                    finding.recordedAt,
                                  ).toLocaleDateString(
                                    'en-US',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    },
                                  )}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* ======================================
                              PARTS
                          ======================================= */}

                          {parts.length > 0 && (
                            <div className="mt-3 border-t border-border pt-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Recorded parts
                                </p>

                                <Badge
                                  variant="secondary"
                                  className="rounded-md text-[9px]"
                                >
                                  {parts.length} part
                                  {parts.length === 1 ? '' : 's'}
                                </Badge>
                              </div>

                              <div className="space-y-1.5">
                                {parts.map(
                                  (part: any, index: number) => {
                                    const total =
                                      Number(
                                        part?.priceAtTime || 0,
                                      ) *
                                      Math.max(
                                        1,
                                        Number(
                                          part?.quantity || 1,
                                        ),
                                      );

                                    return (
                                      <div
                                        key={
                                          part.id ||
                                          index
                                        }
                                        className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
                                      >
                                        <span className="min-w-0 truncate text-[10px] text-foreground">
                                          {part.quantity || 1}×{' '}
                                          {part.partName || 'Part'}
                                        </span>

                                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                          {part.isPms
                                            ? 'PMS'
                                            : `₱${total.toFixed(2)}`}
                                        </span>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-3 sm:p-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
              className="h-10 rounded-md md:h-9"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleAddSelected}
              disabled={isAdding || selectedIds.size === 0}
              className="h-10 rounded-md md:h-9"
            >
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}

              {isAdding
                ? 'Adding...'
                : `Add Selected (${selectedIds.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
