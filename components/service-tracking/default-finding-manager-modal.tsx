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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  FileText,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { defaultFindingsApi } from '@/lib/service-tracking/default-findings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ================================================================
   TYPES
================================================================ */

interface DefaultFindingManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface PartForm {
  id?: string;
  partName: string;
  quantity: number;
  priceAtTime: number;
  isPms: boolean;
}

interface FindingForm {
  title: string;
  isActive: boolean;
  parts: PartForm[];
}

const EMPTY_FORM: FindingForm = {
  title: '',
  isActive: true,
  parts: [],
};

/* ================================================================
   COMPONENT
================================================================ */

export default function DefaultFindingManagerModal({
  open,
  onOpenChange,
  onSaved,
}: DefaultFindingManagerModalProps) {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FindingForm>(EMPTY_FORM);

  /* ==============================================================
     LOAD
  ============================================================== */

  const loadFindings = async () => {
    setLoading(true);

    try {
      const res = await defaultFindingsApi.list();

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            'Failed to load default findings.',
        );
        setFindings([]);
        return;
      }

      setFindings(
        Array.isArray(res?.data)
          ? res.data
          : [],
      );
    } catch (error: any) {
      console.error(
        '[DefaultFindingManagerModal] load error:',
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

  useEffect(() => {
    if (open) {
      void loadFindings();
    }
  }, [open]);

  /* ==============================================================
     FILTER
  ============================================================== */

  const filteredFindings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return findings.filter((finding: any) => {
      if (!showInactive && finding?.isActive === false) {
        return false;
      }

      if (!query) {
        return true;
      }

      const text = [
        finding?.title,
        ...(Array.isArray(finding?.parts)
          ? finding.parts.map((part: any) => part?.partName)
          : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(query);
    });
  }, [findings, search, showInactive]);

  /* ==============================================================
     FORM
  ============================================================== */

  const resetForm = () => {
    setFormData({
      ...EMPTY_FORM,
      parts: [],
    });
    setEditingId(null);
  };

  const handleEdit = (finding: any) => {
    setEditingId(finding.id);

    setFormData({
      title: String(finding?.title || ''),
      isActive: finding?.isActive !== false,
      parts: (Array.isArray(finding?.parts)
        ? finding.parts
        : []
      ).map((part: any) => ({
        id: part.id,
        partName: String(part?.partName || ''),
        quantity: Math.max(
          1,
          Number(part?.quantity) || 1,
        ),
        priceAtTime: Math.max(
          0,
          Number(part?.priceAtTime) || 0,
        ),
        isPms: Boolean(part?.isPms),
      })),
    });
  };

  const addPart = () => {
    setFormData((previous) => ({
      ...previous,
      parts: [
        ...previous.parts,
        {
          id: `new-${Date.now()}-${previous.parts.length}`,
          partName: '',
          quantity: 1,
          priceAtTime: 0,
          isPms: false,
        },
      ],
    }));
  };

  const updatePart = (
    index: number,
    field: keyof PartForm,
    value: any,
  ) => {
    setFormData((previous) => {
      const parts = [...previous.parts];

      parts[index] = {
        ...parts[index],
        [field]: value,
      };

      return {
        ...previous,
        parts,
      };
    });
  };

  const removePart = (index: number) => {
    setFormData((previous) => ({
      ...previous,
      parts: previous.parts.filter(
        (_, partIndex) => partIndex !== index,
      ),
    }));
  };

  /* ==============================================================
     SAVE
  ============================================================== */

  const handleSave = async () => {
    const title = formData.title.trim();

    if (!title) {
      toast.error('Finding title is required.');
      return;
    }

    const parts = formData.parts
      .map((part) => ({
        partName: part.partName.trim(),
        quantity: Math.max(1, Number(part.quantity) || 1),
        priceAtTime: Math.max(0, Number(part.priceAtTime) || 0),
        isPms: Boolean(part.isPms),
      }))
      .filter((part) => part.partName.length > 0);

    setSaving(true);

    try {
      const payload = {
        title,
        isActive: formData.isActive,
        parts,
      };

      const res = editingId
        ? await defaultFindingsApi.update(
            editingId,
            payload,
          )
        : await defaultFindingsApi.create(
            payload,
          );

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            'Failed to save default finding.',
        );
        return;
      }

      toast.success(
        editingId
          ? 'Default finding updated.'
          : 'Default finding created.',
      );

      resetForm();
      await loadFindings();
      onSaved();
    } catch (error: any) {
      console.error(
        '[DefaultFindingManagerModal] save error:',
        error,
      );
      toast.error(
        error?.message ||
          'Error saving default finding.',
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==============================================================
     DELETE
  ============================================================== */

  const handleDelete = async (finding: any) => {
    const confirmed = window.confirm(
      `Delete “${finding.title}” and all of its standard parts?`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const res = await defaultFindingsApi.delete(
        finding.id,
      );

      if (res?.error) {
        toast.error(
          res.errorMessage ||
            'Failed to delete default finding.',
        );
        return;
      }

      toast.success('Default finding deleted.');

      if (editingId === finding.id) {
        resetForm();
      }

      await loadFindings();
      onSaved();
    } catch (error: any) {
      console.error(
        '[DefaultFindingManagerModal] delete error:',
        error,
      );
      toast.error(
        error?.message ||
          'Error deleting default finding.',
      );
    } finally {
      setSaving(false);
    }
  };

  const activeCount = findings.filter(
    (finding) => finding?.isActive !== false,
  ).length;

  const inactiveCount = findings.length - activeCount;

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) {
          resetForm();
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="
          !flex
          !h-[min(92vh,900px)]
          !max-h-[92vh]
          !w-[calc(100vw-1rem)]
          !max-w-[1400px]
          sm:!w-[calc(100vw-2rem)]
          lg:!w-[92vw]
          xl:!w-[88vw]
          !flex-col
          !overflow-hidden
          !rounded-2xl
          !border-border
          !bg-card
          !p-0
          !shadow-2xl
        "
      >
        {/* ========================================================
            HEADER
        ========================================================= */}

        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5 lg:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Default Finding Library
              </DialogTitle>

              <DialogDescription className="mt-1 text-xs leading-5 sm:text-sm">
                Maintain reusable diagnostic observations and the standard parts attached to them.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================
            TOOLBAR
        ========================================================= */}

        <div className="shrink-0 space-y-3 border-b border-border bg-muted/20 p-3 sm:p-4 lg:px-6">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search findings or standard parts..."
                className="h-11 rounded-md pl-10 text-base md:h-9 md:text-sm"
              />
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full text-[10px]"
              >
                {activeCount} active
              </Badge>

              <Badge
                variant="outline"
                className="rounded-full text-[10px]"
              >
                {inactiveCount} inactive
              </Badge>

              <label className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs">
                <Checkbox
                  checked={showInactive}
                  onCheckedChange={(checked) =>
                    setShowInactive(Boolean(checked))
                  }
                />

                Show inactive
              </label>
            </div>
          </div>
        </div>

        {/* ========================================================
            BODY
        ========================================================= */}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className="
              grid
              gap-4
              p-3
              sm:p-4
              lg:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.8fr)]
              lg:items-start
              lg:p-5
              xl:grid-cols-[minmax(0,1.45fr)_minmax(480px,0.8fr)]
            "
          >
            {/* ====================================================
                EXISTING FINDINGS
            ===================================================== */}

            <section className="min-w-0 rounded-xl border border-border bg-background">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Findings
                  </p>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Templates available to the service team.
                  </p>
                </div>

                <Badge
                  variant="secondary"
                  className="rounded-full text-[10px]"
                >
                  {filteredFindings.length} shown
                </Badge>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="flex min-h-[280px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredFindings.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />

                    <p className="mt-3 text-sm font-semibold text-foreground">
                      No findings found
                    </p>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                      Create a finding or adjust the current search/filter.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredFindings.map((finding: any) => (
                      <div
                        key={finding.id}
                        className={cn(
                          'rounded-lg border bg-card p-3 transition-colors',
                          editingId === finding.id
                            ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
                            : 'border-border hover:border-primary/20',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {finding.title}
                                </p>

                                <Badge
                                  variant={
                                    finding.isActive
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="rounded-full text-[9px]"
                                >
                                  {finding.isActive
                                    ? 'Active'
                                    : 'Inactive'}
                                </Badge>
                              </div>

                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {finding.parts?.length || 0}{' '}
                                standard part
                                {finding.parts?.length === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(finding)}
                              className="h-9 w-9 rounded-md md:h-8 md:w-8"
                              aria-label={`Edit ${finding.title}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={saving}
                              onClick={() =>
                                void handleDelete(finding)
                              }
                              className="h-9 w-9 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:h-8 md:w-8"
                              aria-label={`Delete ${finding.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {finding.parts?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                            {finding.parts.map(
                              (part: any, index: number) => (
                                <Badge
                                  key={part.id || index}
                                  variant="outline"
                                  className="max-w-full rounded-md text-[9px] font-normal"
                                >
                                  <Package className="mr-1 h-3 w-3 shrink-0" />

                                  <span className="truncate">
                                    {part.quantity || 1}×{' '}
                                    {part.partName || 'Part'}
                                  </span>

                                  <span className="ml-1 font-mono">
                                    {part.isPms
                                      ? 'PMS'
                                      : `₱${(
                                          Number(
                                            part.priceAtTime || 0,
                                          ) *
                                          Math.max(
                                            1,
                                            Number(
                                              part.quantity || 1,
                                            ),
                                          )
                                        ).toFixed(2)}`}
                                  </span>
                                </Badge>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ====================================================
                EDITOR
            ===================================================== */}

            <section
              className="
                min-w-0
                rounded-xl
                border
                border-border
                bg-background
                lg:sticky
                lg:top-0
              "
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {editingId ? (
                      <Edit2 className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {editingId ? 'Edit Finding' : 'New Finding'}
                    </p>

                    <p className="text-[10px] text-muted-foreground">
                      {editingId
                        ? 'Update this reusable finding.'
                        : 'Create a reusable diagnostic finding.'}
                    </p>
                  </div>
                </div>

                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="h-8 rounded-md px-2 text-xs"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
              </div>

              <div className="space-y-4 p-4 lg:p-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Finding Title
                  </Label>

                  <Input
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                    placeholder="e.g. Engine oil leak"
                    className="h-11 rounded-md text-base md:h-9 md:text-sm"
                  />
                </div>

                {/* Active */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Active
                      </Label>

                      <p className="text-[10px] leading-4 text-muted-foreground">
                        Active findings appear in the reuse picker.
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((previous) => ({
                        ...previous,
                        isActive: checked,
                      }))
                    }
                  />
                </div>

                {/* Parts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Standard Parts
                      </p>

                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        These parts are copied with the finding when reused.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPart}
                      className="h-9 rounded-md px-2.5 text-xs"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Part
                    </Button>
                  </div>

                  {formData.parts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
                      <Package className="mx-auto h-5 w-5 text-muted-foreground" />

                      <p className="mt-2 text-xs font-medium text-foreground">
                        No standard parts
                      </p>

                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                        The finding can still be reused without a part.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.parts.map((part, index) => (
                        <div
                          key={part.id || `part-${index}`}
                          className="rounded-lg border border-border bg-muted/20 p-2.5"
                        >
                          <div
                            className="
                              grid
                              gap-2
                              md:grid-cols-[minmax(0,1fr)_75px_100px_80px_36px]
                              md:items-end
                            "
                          >
                            <div className="space-y-1">
                              <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Part
                              </Label>

                              <Input
                                value={part.partName}
                                onChange={(event) =>
                                  updatePart(
                                    index,
                                    'partName',
                                    event.target.value,
                                  )
                                }
                                placeholder="Part name"
                                className="h-10 rounded-md text-base md:h-9 md:text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Qty
                              </Label>

                              <Input
                                type="number"
                                min="1"
                                value={part.quantity}
                                onChange={(event) =>
                                  updatePart(
                                    index,
                                    'quantity',
                                    Math.max(
                                      1,
                                      Number(event.target.value) || 1,
                                    ),
                                  )
                                }
                                className="h-10 rounded-md text-base md:h-9 md:text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Price
                              </Label>

                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={part.priceAtTime}
                                disabled={part.isPms}
                                onChange={(event) =>
                                  updatePart(
                                    index,
                                    'priceAtTime',
                                    Math.max(
                                      0,
                                      Number(event.target.value) || 0,
                                    ),
                                  )
                                }
                                className="h-10 rounded-md text-base md:h-9 md:text-sm"
                              />
                            </div>

                            <label className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 text-[10px] font-semibold md:h-9">
                              <Checkbox
                                checked={part.isPms}
                                onCheckedChange={(checked) =>
                                  updatePart(
                                    index,
                                    'isPms',
                                    Boolean(checked),
                                  )
                                }
                              />
                              PMS
                            </label>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                removePart(index)
                              }
                              className="h-10 w-10 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:h-8 md:w-8"
                              aria-label={`Remove part ${index + 1}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                  <p className="text-[10px] leading-4 text-muted-foreground">
                    PMS parts are recorded with a zero customer charge when they are reused.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={saving}
                      className="h-10 rounded-md md:h-9"
                    >
                      Cancel Edit
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="h-10 rounded-md md:h-9"
                  >
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}

                    {editingId
                      ? 'Update Finding'
                      : 'Create Finding'}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-3 sm:p-4 lg:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-10 w-full rounded-md sm:w-auto md:h-9"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}