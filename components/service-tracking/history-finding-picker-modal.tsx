'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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

import {
  useHistoryFindings,
} from '@/hooks/service-tracking/useHistoryFindings';

import { format } from 'date-fns';
import { toast } from 'sonner';

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
    }>
  ) => Promise<void>;
  isAdding: boolean;
  phase: 'INSPECTION';
}

export default function HistoryFindingPickerModal({
  open,
  onOpenChange,
  onAddFindings,
  isAdding,
  phase,
}: HistoryFindingPickerModalProps) {
  const [search, setSearch] =
    useState('');

  const [selectedIds, setSelectedIds] =
    useState<Set<string>>(new Set());

  const {
    findings,
    loading,
    loadFindings,
  } =
    useHistoryFindings(
      search,
      phase
    );

  useEffect(() => {
    if (open) {
      loadFindings();
    }
  }, [open, loadFindings]);

  const handleToggle = (
    id: string
  ) => {
    const newSet = new Set(
      selectedIds
    );

    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }

    setSelectedIds(newSet);
  };

  const handleAddSelected =
    async () => {
      const selected =
        findings.filter((f) =>
          selectedIds.has(f.id)
        );

      if (selected.length === 0) {
        toast.warning(
          'Please select at least one finding.'
        );
        return;
      }

      const findingsToAdd =
        selected.map((f) => ({
          description: f.description,
          parts: f.parts.map(
            (p: any) => ({
              partName:
                p.partName,
              quantity:
                p.quantity,
              priceAtTime:
                parseFloat(
                  p.priceAtTime
                ),
              isPms:
                p.isPms,
            })
          ),
        }));

      await onAddFindings(
        findingsToAdd
      );

      setSelectedIds(
        new Set()
      );
    };

  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent
        className="
          flex
          h-[94vh]
          w-[calc(100%-1rem)]
          max-w-2xl
          flex-col
          rounded-xl
          border
          border-border
          bg-card
          p-0
          shadow-xl
          sm:h-auto
          sm:max-h-[90vh]
        "
      >
        {/* =======================================================
         * HEADER
         * ===================================================== */}
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Add Findings from History
              </DialogTitle>

              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                Select previously recorded inspection
                findings to reuse for this service.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* =======================================================
         * SEARCH
         * ===================================================== */}
        <div className="shrink-0 border-b border-border bg-muted/20 p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search findings..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="
                h-11
                rounded-md
                pl-10
                text-base
                md:h-9
                md:text-sm
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {selectedIds.size}{' '}
                {selectedIds.size === 1
                  ? 'finding'
                  : 'findings'}{' '}
                selected
              </p>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedIds(
                    new Set()
                  )
                }
                className="h-8 rounded-md px-2 text-xs"
              >
                Clear selection
              </Button>
            </div>
          )}
        </div>

        {/* =======================================================
         * CONTENT
         * ===================================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-3 p-4 sm:p-5">
            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>

                <p className="mt-3 text-sm font-medium">
                  Loading history
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Retrieving previous inspection findings...
                </p>
              </div>
            ) : findings.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>

                <p className="mt-3 text-sm font-medium">
                  No findings found
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  {search.trim()
                    ? 'No historical findings match your search.'
                    : 'There are no previously recorded findings available.'}
                </p>
              </div>
            ) : (
              findings.map((item) => {
                const selected =
                  selectedIds.has(
                    item.id
                  );

                return (
                  <div
                    key={item.id}
                    className="
                      overflow-hidden
                      rounded-lg
                      border
                      border-border
                      bg-background
                      transition-colors
                    "
                  >
                    {/* Main selection row */}
                    <label
                      htmlFor={`finding-${item.id}`}
                      className="
                        flex
                        cursor-pointer
                        items-start
                        gap-3
                        p-4
                      "
                    >
                      <Checkbox
                        id={`finding-${item.id}`}
                        checked={selected}
                        onCheckedChange={() =>
                          handleToggle(
                            item.id
                          )
                        }
                        className="mt-1"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Historical finding
                              </p>

                              <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-5 text-foreground">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {selected && (
                            <Badge className="shrink-0 rounded-md text-[10px]">
                              <Check className="mr-1 h-3 w-3" />
                              Selected
                            </Badge>
                          )}
                        </div>

                        {/* Parts */}
                        {item.parts &&
                          item.parts.length >
                            0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {item.parts.map(
                                (
                                  p: any,
                                  i: number
                                ) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="rounded-md text-[10px] font-medium"
                                  >
                                    {p.quantity}x{' '}
                                    {p.partName}

                                    {p.isPms
                                      ? ' (PMS)'
                                      : ` · ₱${(
                                          parseFloat(
                                            p.priceAtTime
                                          ) *
                                          p.quantity
                                        ).toFixed(2)}`}
                                  </Badge>
                                )
                              )}
                            </div>
                          )}

                        {/* Historical metadata */}
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-xs text-muted-foreground">
                              {item.customer
                                ?.fullname ||
                                'Unknown customer'}
                            </span>
                          </div>

                          <div className="flex min-w-0 items-center gap-2">
                            <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-xs text-muted-foreground">
                              {item.vehicle
                                ?.make}{' '}
                              {item.vehicle
                                ?.model}{' '}
                              (
                              {item.vehicle
                                ?.plateNumber ||
                                'N/A'}
                              )
                            </span>
                          </div>

                          <div className="flex min-w-0 items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-xs text-muted-foreground">
                              {format(
                                new Date(
                                  item.recordedAt
                                ),
                                'MMM d, yyyy'
                              )}
                            </span>
                          </div>

                          <div className="flex min-w-0 items-center gap-2">
                            <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-xs text-muted-foreground">
                              Inspection history
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =======================================================
         * FOOTER
         * ===================================================== */}
        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-4 sm:p-5">
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
              disabled={isAdding}
              className="h-11 rounded-md md:h-9"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={
                handleAddSelected
              }
              disabled={
                isAdding ||
                selectedIds.size === 0
              }
              className="
                h-11
                rounded-md
                md:h-9
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
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