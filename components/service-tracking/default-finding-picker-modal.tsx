'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  Button,
} from '@/components/ui/button';

import {
  Checkbox,
} from '@/components/ui/checkbox';

import {
  Badge,
} from '@/components/ui/badge';

import {
  FileText,
  Search,
  Loader2,
  Check,
  Package,
  Database,
  X,
} from 'lucide-react';

import {
  defaultFindingsApi,
} from '@/lib/service-tracking/default-findings';

import {
  toast,
} from 'sonner';

import {
  cn,
} from '@/lib/utils';

/* ================================================================
   TYPES
================================================================ */

interface DefaultFindingPickerModalProps {
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
}

/* ================================================================
   COMPONENT
================================================================ */

export default function DefaultFindingPickerModal({
  open,
  onOpenChange,
  onAddFindings,
  isAdding,
}: DefaultFindingPickerModalProps) {
  const [findings, setFindings] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [selectedIds, setSelectedIds] =
    useState<Set<string>>(new Set());

  /* ==============================================================
     LOAD DEFAULT FINDINGS
  ============================================================== */

  const loadFindings = async () => {
    setLoading(true);

    try {
      const res =
        await defaultFindingsApi.list();

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            'Failed to load default findings.',
        );

        setFindings([]);
      } else {
        setFindings(
          Array.isArray(res?.data)
            ? res.data
            : [],
        );
      }
    } catch (error: any) {
      console.error(
        '[DefaultFindingPickerModal] Failed to load findings:',
        error,
      );

      toast.error(
        error?.message ||
          'Error loading default findings.',
      );

      setFindings([]);
    } finally {
      setLoading(false);
    }
  };

  /* ==============================================================
     OPEN
  ============================================================== */

  useEffect(() => {
    if (!open) {
      setSelectedIds(
        new Set(),
      );
      setSearch('');
      return;
    }

    void loadFindings();
  }, [open]);

  /* ==============================================================
     ACTIVE FINDINGS
  ============================================================== */

  const activeFindings =
    useMemo(
      () =>
        findings.filter(
          (finding) =>
            finding?.isActive !==
            false,
        ),
      [findings],
    );

  /* ==============================================================
     FILTER
  ============================================================== */

  const filteredFindings =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return activeFindings;
      }

      return activeFindings.filter(
        (finding) => {
          const title = String(
            finding?.title ||
              '',
          ).toLowerCase();

          const parts =
            Array.isArray(
              finding?.parts,
            )
              ? finding.parts
                  .map(
                    (part: any) =>
                      part?.partName ||
                      '',
                  )
                  .join(' ')
                  .toLowerCase()
              : '';

          return (
            title.includes(
              query,
            ) ||
            parts.includes(
              query,
            )
          );
        },
      );
    }, [activeFindings, search]);

  /* ==============================================================
     SELECTION
  ============================================================== */

  const handleToggle = (
    id: string,
  ) => {
    setSelectedIds(
      (previous) => {
        const next = new Set(
          previous,
        );

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      },
    );
  };

  const handleSelectAll = () => {
    if (
      filteredFindings.length ===
      0
    ) {
      return;
    }

    const visibleIds =
      filteredFindings.map(
        (finding) =>
          finding.id,
      );

    const everyVisibleSelected =
      visibleIds.every((id) =>
        selectedIds.has(id),
      );

    setSelectedIds(
      (previous) => {
        const next = new Set(
          previous,
        );

        if (
          everyVisibleSelected
        ) {
          visibleIds.forEach(
            (id) =>
              next.delete(id),
          );
        } else {
          visibleIds.forEach(
            (id) =>
              next.add(id),
          );
        }

        return next;
      },
    );
  };

  /* ==============================================================
     ADD
  ============================================================== */

  const handleAddSelected =
    async () => {
      const selected =
        activeFindings.filter(
          (finding) =>
            selectedIds.has(
              finding.id,
            ),
        );

      if (
        selected.length ===
        0
      ) {
        toast.warning(
          'Select at least one default finding.',
        );

        return;
      }

      const payload =
        selected
          .map(
            (finding) => ({
              description: String(
                finding?.title ||
                  '',
              ).trim(),

              parts:
                Array.isArray(
                  finding?.parts,
                )
                  ? finding.parts
                      .map(
                        (part: any) => ({
                          partName: String(
                            part?.partName ||
                              'Part',
                          ).trim(),
                          quantity:
                            Math.max(
                              1,
                              Number(
                                part?.quantity ||
                                  1,
                              ),
                            ),
                          priceAtTime:
                            Math.max(
                              0,
                              Number(
                                part?.priceAtTime ||
                                  0,
                              ),
                            ),
                          isPms:
                            Boolean(
                              part?.isPms,
                            ),
                        }),
                      )
                      .filter(
                        (part: any) =>
                          part.partName.length >
                          0,
                      )
                  : [],
            }),
          )
          .filter(
            (finding) =>
              finding.description.length >
              0,
          );

      if (
        payload.length ===
        0
      ) {
        toast.error(
          'The selected default findings are invalid.',
        );

        return;
      }

      await onAddFindings(
        payload,
      );

      setSelectedIds(
        new Set(),
      );
    };

  const allVisibleSelected =
    filteredFindings.length >
      0 &&
    filteredFindings.every(
      (finding) =>
        selectedIds.has(
          finding.id,
        ),
    );

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
          max-w-2xl
          flex-col
          overflow-hidden
          rounded-xl
          border
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
              <Database className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Add Default Findings
              </DialogTitle>

              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                Reuse active diagnostic finding templates and their
                standard parts for this inspection.
              </p>
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

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search findings or parts..."
              className="
                h-10
                w-full
                rounded-md
                border
                border-input
                bg-background
                pl-9
                pr-9
                text-base
                outline-none
                focus-visible:ring-2
                focus-visible:ring-ring

                md:text-sm
              "
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full text-[10px]"
              >
                {
                  activeFindings.length
                }{' '}
                active
              </Badge>

              {selectedIds.size >
                0 && (
                <Badge className="rounded-full text-[10px]">
                  {selectedIds.size}{' '}
                  selected
                </Badge>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={
                handleSelectAll
              }
              disabled={
                filteredFindings.length ===
                0
              }
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
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />

                <p className="mt-3 text-sm font-medium text-foreground">
                  Loading default findings...
                </p>
              </div>
            ) : activeFindings.length ===
              0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>

                <p className="mt-3 text-sm font-semibold text-foreground">
                  No active default findings
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  Create or activate a default finding in the Default
                  Findings manager first.
                </p>
              </div>
            ) : filteredFindings.length ===
              0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
                <Search className="h-5 w-5 text-muted-foreground" />

                <p className="mt-3 text-sm font-medium text-foreground">
                  No matching findings
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Try a different finding or part name.
                </p>
              </div>
            ) : (
              filteredFindings.map(
                (finding) => {
                  const selected =
                    selectedIds.has(
                      finding.id,
                    );

                  const parts =
                    Array.isArray(
                      finding?.parts,
                    )
                      ? finding.parts
                      : [];

                  const partsTotal =
                    parts.reduce(
                      (
                        total: number,
                        part: any,
                      ) =>
                        total +
                        (part?.isPms
                          ? 0
                          : Number(
                              part?.priceAtTime ||
                                0,
                            ) *
                            Math.max(
                              1,
                              Number(
                                part?.quantity ||
                                  1,
                              ),
                            )),
                      0,
                    );

                  return (
                    <label
                      key={
                        finding.id
                      }
                      htmlFor={`default-finding-${finding.id}`}
                      className={cn(
                        'block cursor-pointer rounded-lg border bg-background p-3 transition-colors',
                        'hover:border-primary/30 hover:bg-primary/[0.02]',
                        selected
                          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/15'
                          : 'border-border',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`default-finding-${finding.id}`}
                          checked={
                            selected
                          }
                          onCheckedChange={() =>
                            handleToggle(
                              finding.id,
                            )
                          }
                          className="mt-1"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <FileText className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Default finding
                                </p>

                                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                                  {
                                    finding.title
                                  }
                                </p>
                              </div>
                            </div>

                            {selected && (
                              <Badge className="shrink-0 rounded-full px-2 text-[9px]">
                                <Check className="mr-1 h-3 w-3" />
                                Selected
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="rounded-md text-[9px]"
                            >
                              {parts.length}{' '}
                              part
                              {parts.length ===
                              1
                                ? ''
                                : 's'}
                            </Badge>

                            {partsTotal >
                              0 && (
                              <Badge
                                variant="secondary"
                                className="rounded-md font-mono text-[9px]"
                              >
                                ₱
                                {partsTotal.toFixed(
                                  2,
                                )}
                              </Badge>
                            )}
                          </div>

                          {parts.length >
                            0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {parts.map(
                                (
                                  part: any,
                                  index: number,
                                ) => (
                                  <Badge
                                    key={
                                      part.id ||
                                      index
                                    }
                                    variant="outline"
                                    className="max-w-full rounded-md text-[9px] font-normal"
                                  >
                                    <Package className="mr-1 h-3 w-3 shrink-0" />
                                    <span className="truncate">
                                      {part.quantity ||
                                        1}{' '}
                                      ×{' '}
                                      {part.partName ||
                                        'Part'}
                                    </span>
                                  </Badge>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                },
              )
            )}
          </div>
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <DialogFooter
          className="
            shrink-0
            border-t
            border-border
            bg-muted/20
            p-3

            sm:p-4
          "
        >
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(
                  false,
                )
              }
              disabled={
                isAdding
              }
              className="h-10 rounded-md sm:w-auto md:h-9"
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
                selectedIds.size ===
                  0
              }
              className="h-10 rounded-md sm:w-auto md:h-9"
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
