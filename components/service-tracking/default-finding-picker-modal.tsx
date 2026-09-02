'use client';

import React, { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  FileText,
  Loader2,
  Package,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { defaultFindingsApi } from '@/lib/service-tracking/default-findings';
import { toast } from 'sonner';

interface DefaultFindingManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface Part {
  id: string;
  partName: string;
  quantity: number;
  priceAtTime: number;
  isPms: boolean;
}

export default function DefaultFindingManagerModal({
  open,
  onOpenChange,
  onSaved,
}: DefaultFindingManagerModalProps) {
  const [findings, setFindings] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [formData, setFormData] =
    useState<{
      title: string;
      isActive: boolean;
      parts: Part[];
    }>({
      title: '',
      isActive: true,
      parts: [],
    });

  const loadFindings = async () => {
    setLoading(true);

    try {
      const res =
        await defaultFindingsApi.list();

      if (res.error) {
        toast.error(
          res.errorMessage ||
            'Failed to load findings.'
        );
      } else {
        setFindings(
          res.data || []
        );
      }
    } catch (err) {
      toast.error(
        'Error loading findings.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadFindings();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      title: '',
      isActive: true,
      parts: [],
    });

    setEditingId(null);
  };

  const handleEdit = (
    finding: any
  ) => {
    setEditingId(finding.id);

    setFormData({
      title: finding.title,
      isActive: finding.isActive,
      parts: finding.parts.map(
        (p: any) => ({
          ...p,
        })
      ),
    });
  };

  const handleDelete = async (
    id: string
  ) => {
    if (
      !confirm(
        'Delete this finding and its parts?'
      )
    ) {
      return;
    }

    try {
      const res =
        await defaultFindingsApi.delete(
          id
        );

      if (res.error) {
        toast.error(
          res.errorMessage ||
            'Failed to delete.'
        );
      } else {
        toast.success(
          'Deleted.'
        );

        loadFindings();
      }
    } catch (err) {
      toast.error(
        'Error deleting.'
      );
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error(
        'Title is required.'
      );
      return;
    }

    try {
      const payload = {
        title:
          formData.title.trim(),

        isActive:
          formData.isActive,

        parts: formData.parts.map(
          (p) => ({
            partName:
              p.partName.trim(),

            quantity:
              p.quantity,

            priceAtTime:
              p.priceAtTime,

            isPms:
              p.isPms,
          })
        ),
      };

      let res;

      if (editingId) {
        res =
          await defaultFindingsApi.update(
            editingId,
            payload
          );
      } else {
        res =
          await defaultFindingsApi.create(
            payload
          );
      }

      if (res.error) {
        toast.error(
          res.errorMessage ||
            'Failed to save.'
        );
      } else {
        toast.success(
          editingId
            ? 'Updated.'
            : 'Created.'
        );

        resetForm();
        loadFindings();
        onSaved();
      }
    } catch (err) {
      toast.error(
        'Error saving.'
      );
    }
  };

  const addPart = () => {
    setFormData({
      ...formData,
      parts: [
        ...formData.parts,
        {
          id: Date.now().toString(),
          partName: '',
          quantity: 1,
          priceAtTime: 0,
          isPms: false,
        },
      ],
    });
  };

  const removePart = (
    index: number
  ) => {
    const newParts = [
      ...formData.parts,
    ];

    newParts.splice(index, 1);

    setFormData({
      ...formData,
      parts: newParts,
    });
  };

  const updatePart = (
    index: number,
    field: keyof Part,
    value: any
  ) => {
    const newParts = [
      ...formData.parts,
    ];

    newParts[index] = {
      ...newParts[index],
      [field]: value,
    };

    setFormData({
      ...formData,
      parts: newParts,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
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
          sm:max-h-[90vh]
        "
      >
        {/* =====================================================
         * HEADER
         * =================================================== */}
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Manage Default Findings
              </DialogTitle>

              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                Create reusable diagnostic findings and
                their standard parts.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* =====================================================
         * BODY
         * =================================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-5">
            {/* Existing findings */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Existing Findings
                  </p>

                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Reusable findings available to staff.
                  </p>
                </div>

                {findings.length > 0 && (
                  <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                    {findings.length}{' '}
                    {findings.length === 1
                      ? 'Finding'
                      : 'Findings'}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-border bg-muted/20 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />

                  <p className="mt-3 text-sm font-medium">
                    Loading findings
                  </p>
                </div>
              ) : findings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                  <FileText className="mx-auto h-5 w-5 text-muted-foreground" />

                  <p className="mt-2 text-sm font-medium">
                    No default findings yet
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Create your first reusable finding below.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {findings.map((finding) => (
                    <div
                      key={finding.id}
                      className="
                        rounded-lg
                        border
                        border-border
                        bg-background
                        p-3
                      "
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <FileText className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold">
                                {finding.title}
                              </p>

                              <span
                                className={
                                  finding.isActive
                                    ? 'rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-700'
                                    : 'rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground'
                                }
                              >
                                {finding.isActive
                                  ? 'Active'
                                  : 'Inactive'}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {finding.parts?.length ||
                                0}{' '}
                              associated part
                              {finding.parts?.length ===
                              1
                                ? ''
                                : 's'}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleEdit(
                                finding
                              )
                            }
                            className="
                              h-10
                              w-10
                              rounded-md
                              text-muted-foreground
                              hover:bg-primary/5
                              hover:text-primary
                              md:h-8
                              md:w-8
                            "
                            aria-label="Edit finding"
                          >
                            <Edit2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDelete(
                                finding.id
                              )
                            }
                            className="
                              h-10
                              w-10
                              rounded-md
                              text-muted-foreground
                              hover:bg-destructive/10
                              hover:text-destructive
                              md:h-8
                              md:w-8
                            "
                            aria-label="Delete finding"
                          >
                            <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {finding.parts &&
                        finding.parts.length >
                          0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                            {finding.parts.map(
                              (
                                part: any,
                                index: number
                              ) => (
                                <span
                                  key={index}
                                  className={`
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    rounded-md
                                    border
                                    px-2
                                    py-1
                                    text-[10px]
                                    font-medium
                                    ${
                                      part.isPms
                                        ? 'border-green-200 bg-green-50 text-green-700'
                                        : 'border-border bg-muted/40 text-foreground'
                                    }
                                  `}
                                >
                                  <Package className="h-3 w-3" />

                                  <span>
                                    {part.quantity}x{' '}
                                    {part.partName ||
                                      'Part'}
                                  </span>

                                  <span className="font-mono">
                                    {part.isPms
                                      ? 'PMS'
                                      : `₱${(
                                          Number(
                                            part.priceAtTime
                                          ) *
                                          Number(
                                            part.quantity
                                          )
                                        ).toFixed(2)}`}
                                  </span>
                                </span>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* =================================================
             * CREATE / EDIT
             * =============================================== */}
            <section className="overflow-hidden rounded-lg border border-border bg-background">
              <div className="border-b border-border bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {editingId ? (
                      <Edit2 className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      {editingId
                        ? 'Edit Finding'
                        : 'Create Finding'}
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                      Configure the reusable finding below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Title *
                  </Label>

                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title:
                          e.target.value,
                      })
                    }
                    placeholder="e.g., Engine noise diagnosis"
                    className="
                      h-11
                      rounded-md
                      text-base
                      md:h-9
                      md:text-sm
                    "
                  />
                </div>

                {/* Active */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>

                    <div>
                      <Label
                        htmlFor="default-finding-active"
                        className="text-sm font-medium"
                      >
                        Active
                      </Label>

                      <p className="text-[11px] text-muted-foreground">
                        Make this finding available for reuse.
                      </p>
                    </div>
                  </div>

                  <Switch
                    id="default-finding-active"
                    checked={
                      formData.isActive
                    }
                    onCheckedChange={(
                      checked
                    ) =>
                      setFormData({
                        ...formData,
                        isActive:
                          checked,
                      })
                    }
                  />
                </div>

                {/* Parts */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Parts
                      </Label>

                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Standard parts associated with this finding.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPart}
                      className="
                        h-10
                        rounded-md
                        md:h-9
                      "
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Part
                    </Button>
                  </div>

                  {formData.parts.length ===
                  0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
                      <Package className="mx-auto h-5 w-5 text-muted-foreground" />

                      <p className="mt-2 text-xs font-medium">
                        No parts configured
                      </p>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Parts can be added to automatically include them with the finding.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.parts.map(
                        (
                          part,
                          idx
                        ) => (
                          <div
                            key={
                              part.id
                            }
                            className="rounded-lg border border-border bg-muted/20 p-3"
                          >
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_90px_120px_auto] md:items-end">
                              {/* Part */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Part Name
                                </Label>

                                <Input
                                  value={
                                    part.partName
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updatePart(
                                      idx,
                                      'partName',
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                  placeholder="Part name"
                                  className="
                                    h-11
                                    rounded-md
                                    text-base
                                    md:h-9
                                    md:text-sm
                                  "
                                />
                              </div>

                              {/* Quantity */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Qty
                                </Label>

                                <Input
                                  type="number"
                                  min="1"
                                  value={
                                    part.quantity
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updatePart(
                                      idx,
                                      'quantity',
                                      parseInt(
                                        e
                                          .target
                                          .value
                                      ) ||
                                        1
                                    )
                                  }
                                  className="
                                    h-11
                                    rounded-md
                                    text-base
                                    md:h-9
                                    md:text-sm
                                  "
                                />
                              </div>

                              {/* Price */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Price
                                </Label>

                                <Input
                                  type="number"
                                  step="0.01"
                                  value={
                                    part.priceAtTime
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updatePart(
                                      idx,
                                      'priceAtTime',
                                      parseFloat(
                                        e
                                          .target
                                          .value
                                      ) ||
                                        0
                                    )
                                  }
                                  disabled={
                                    part.isPms
                                  }
                                  placeholder="0.00"
                                  className="
                                    h-11
                                    rounded-md
                                    text-base
                                    md:h-9
                                    md:text-sm
                                  "
                                />
                              </div>

                              {/* PMS / delete */}
                              <div className="flex min-h-11 items-center justify-between gap-3 md:min-h-9 md:justify-end">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={
                                      part.isPms
                                    }
                                    onCheckedChange={(
                                      checked
                                    ) =>
                                      updatePart(
                                        idx,
                                        'isPms',
                                        !!checked
                                      )
                                    }
                                    id={`pms-${part.id}`}
                                  />

                                  <Label
                                    htmlFor={`pms-${part.id}`}
                                    className="cursor-pointer text-xs font-semibold"
                                  >
                                    PMS
                                  </Label>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    removePart(
                                      idx
                                    )
                                  }
                                  className="
                                    h-10
                                    w-10
                                    rounded-md
                                    text-muted-foreground
                                    hover:bg-destructive/10
                                    hover:text-destructive
                                    md:h-8
                                    md:w-8
                                  "
                                  aria-label="Remove part"
                                >
                                  <X className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                    <p className="text-[11px] leading-5 text-muted-foreground">
                      Checking PMS makes the part free by setting
                      its price to ₱0.00.
                    </p>
                  </div>
                </div>

                {/* Form actions */}
                <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={
                        resetForm
                      }
                      className="h-11 rounded-md sm:w-auto md:h-9"
                    >
                      Cancel Edit
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={
                      handleSave
                    }
                    className="h-11 rounded-md sm:w-auto md:h-9"
                  >
                    {editingId
                      ? 'Update Finding'
                      : 'Create Finding'}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* =====================================================
         * FOOTER
         * =================================================== */}
        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-4 sm:p-5">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onOpenChange(false)
            }
            className="h-11 w-full rounded-md sm:w-auto md:h-9"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}