'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import {
  AlertCircle,
  FileText,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { toast } from 'sonner';
import { findingsApi } from '@/lib/service-tracking/findings';
import { cn } from '@/lib/utils';

interface FindingPart {
  id: string;
  partName: string;
  quantity: number;
  priceAtTime: number;
  isPms: boolean;
}

interface Finding {
  id: string;
  description: string;
  parts: FindingPart[];
}

interface FindingsListProps {
  findings: Finding[];
  appointmentId: string;
  onFindingsUpdated: () => void;
}

export default function FindingsList({
  findings,
  appointmentId,
  onFindingsUpdated,
}: FindingsListProps) {
  const [editingFinding, setEditingFinding] =
    useState<Finding | null>(null);

  const [editModalOpen, setEditModalOpen] =
    useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    description: '',
    parts: [] as FindingPart[],
  });

  const openEdit = (finding: Finding) => {
    setEditingFinding(finding);

    setEditForm({
      description: finding.description,
      parts: JSON.parse(
        JSON.stringify(finding.parts || [])
      ),
    });

    setEditModalOpen(true);
  };

  const handleEditPartChange = (
    partId: string,
    field: keyof FindingPart,
    value: any
  ) => {
    setEditForm((prev) => ({
      ...prev,
      parts: prev.parts.map((p) => {
        if (p.id === partId) {
          return {
            ...p,
            [field]:
              field === 'isPms'
                ? !!value
                : value,
          };
        }

        return p;
      }),
    }));
  };

  const addPartToEdit = () => {
    setEditForm((prev) => ({
      ...prev,
      parts: [
        ...prev.parts,
        {
          id: Date.now().toString(),
          partName: '',
          quantity: 1,
          priceAtTime: 0,
          isPms: false,
        },
      ],
    }));
  };

  const removePartFromEdit = (
    partId: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      parts: prev.parts.filter(
        (p) => p.id !== partId
      ),
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingFinding) return;

    if (!editForm.description.trim()) {
      toast.error(
        'Finding description is required.'
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        description: editForm.description.trim(),
        parts: editForm.parts.map((p) => ({
          id: p.id.startsWith('temp')
            ? undefined
            : p.id,
          partName:
            p.partName.trim() || undefined,
          quantity: p.quantity,
          priceAtTime: p.priceAtTime,
          isPms: p.isPms,
        })),
      };

      const res = await findingsApi.update(
        editingFinding.id,
        payload
      );

      if (res.error) {
        toast.error(
          res.errorMessage ||
            'Failed to update finding.'
        );
      } else {
        toast.success('Finding updated.');
        setEditModalOpen(false);
        onFindingsUpdated();
      }
    } catch (err: any) {
      toast.error(
        err.message ||
          'Error updating finding.'
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const res = await findingsApi.delete(
        deletingId
      );

      if (res.error) {
        toast.error(
          res.errorMessage ||
            'Failed to delete finding.'
        );
      } else {
        toast.success('Finding deleted.');
        setDeleteDialogOpen(false);
        onFindingsUpdated();
      }
    } catch (err: any) {
      toast.error(
        err.message ||
          'Error deleting finding.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (findings.length === 0) {
    return null;
  }

  return (
    <>
      {/* =========================================================
       * FINDINGS CARD
       * ======================================================= */}
      <Card className="rounded-xl border border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Recorded Findings
                </h3>

                <p className="text-xs text-muted-foreground">
                  Diagnostic observations recorded
                  during inspection
                </p>
              </div>
            </div>

            <Badge
              variant="secondary"
              className="w-fit rounded-md px-2 py-1 text-[10px] font-semibold"
            >
              {findings.length}{' '}
              {findings.length === 1
                ? 'Finding'
                : 'Findings'}
            </Badge>
          </div>

          {/* Findings */}
          <div className="space-y-3 p-4 sm:p-5">
            {findings.map((finding, index) => (
              <div
                key={finding.id}
                className="
                  overflow-hidden
                  rounded-lg
                  border
                  border-border
                  bg-background
                  transition-colors
                  hover:border-primary/20
                "
              >
                {/* Finding header */}
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Finding
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-5 text-foreground">
                        {finding.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        openEdit(finding)
                      }
                      aria-label="Edit finding"
                      className="
                        h-10
                        w-10
                        rounded-md
                        text-muted-foreground
                        hover:bg-primary/5
                        hover:text-primary
                        md:h-8
                        md:w-8
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                      "
                    >
                      <Pencil className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        confirmDelete(
                          finding.id
                        )
                      }
                      aria-label="Delete finding"
                      className="
                        h-10
                        w-10
                        rounded-md
                        text-muted-foreground
                        hover:bg-destructive/10
                        hover:text-destructive
                        md:h-8
                        md:w-8
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                      "
                    >
                      <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Parts */}
                {finding.parts &&
                  finding.parts.length > 0 && (
                    <div className="space-y-2 p-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />

                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Parts & Supplies
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {finding.parts.map(
                          (part, i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2',
                                part.isPms
                                  ? 'border-green-200/70 bg-green-50/50'
                                  : 'border-border bg-muted/30'
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={cn(
                                    'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                    part.isPms
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-primary/10 text-primary'
                                  )}
                                >
                                  {part.quantity}x
                                </span>

                                <span className="truncate text-xs font-medium text-foreground">
                                  {part.partName ||
                                    'Part'}
                                </span>
                              </div>

                              <span
                                className={cn(
                                  'shrink-0 font-mono text-[11px]',
                                  part.isPms
                                    ? 'font-semibold text-green-700'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {part.isPms
                                  ? 'PMS'
                                  : `₱${(
                                      part.priceAtTime *
                                      part.quantity
                                    ).toFixed(2)}`}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* =========================================================
       * EDIT FINDING MODAL
       * ======================================================= */}
      <Dialog
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      >
        <DialogContent
          className="
            flex
            h-[92vh]
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
          <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Pencil className="h-4 w-4" />
              </div>

              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Edit Finding
                </DialogTitle>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Update the diagnostic observation and
                  associated parts.
                </p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 p-4 sm:p-5">
              {/* Description */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description *
                </Label>

                <Textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      description:
                        e.target.value,
                    })
                  }
                  placeholder="Describe the finding..."
                  className="
                    min-h-[100px]
                    resize-none
                    rounded-md
                    text-base
                    md:text-sm
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                  "
                />
              </div>

              {/* Parts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Parts & Supplies
                    </Label>

                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Materials associated with this
                      finding.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPartToEdit}
                    className="
                      h-10
                      rounded-md
                      md:h-9
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-ring
                      focus-visible:ring-offset-2
                    "
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Part
                  </Button>
                </div>

                {editForm.parts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                    <Package className="mx-auto h-5 w-5 text-muted-foreground" />

                    <p className="mt-2 text-xs font-medium text-foreground">
                      No parts added
                    </p>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Add parts or supplies when needed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editForm.parts.map(
                      (part) => (
                        <div
                          key={part.id}
                          className="
                            rounded-lg
                            border
                            border-border
                            bg-muted/20
                            p-3
                          "
                        >
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_90px_120px_auto] md:items-end">
                            {/* Name */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Part Name
                              </Label>

                              <Input
                                value={
                                  part.partName
                                }
                                onChange={(e) =>
                                  handleEditPartChange(
                                    part.id,
                                    'partName',
                                    e.target
                                      .value
                                  )
                                }
                                placeholder="e.g., Oil Filter"
                                className="
                                  h-11
                                  rounded-md
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
                                onChange={(e) =>
                                  handleEditPartChange(
                                    part.id,
                                    'quantity',
                                    parseInt(
                                      e.target
                                        .value
                                    ) || 1
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
                                onChange={(e) =>
                                  handleEditPartChange(
                                    part.id,
                                    'priceAtTime',
                                    parseFloat(
                                      e.target
                                        .value
                                    ) || 0
                                  )
                                }
                                disabled={
                                  part.isPms
                                }
                                className="
                                  h-11
                                  rounded-md
                                  text-base
                                  md:h-9
                                  md:text-sm
                                  disabled:cursor-not-allowed
                                  disabled:opacity-60
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
                                    handleEditPartChange(
                                      part.id,
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
                                  removePartFromEdit(
                                    part.id
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
                    Checking PMS sets the price to
                    ₱0.00 because the part is included in
                    the package.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-4 sm:p-5">
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setEditModalOpen(false)
                }
                disabled={saving}
                className="
                  h-11
                  rounded-md
                  md:h-9
                "
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
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
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
       * DELETE DIALOG
       * ======================================================= */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <DialogContent
          className="
            w-[calc(100%-1rem)]
            max-w-md
            rounded-xl
            border
            border-border
            bg-card
            shadow-xl
          "
        >
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>

            <DialogTitle className="pt-2 text-lg font-semibold">
              Delete Finding
            </DialogTitle>

            <DialogDescription className="text-sm leading-6">
              Are you sure you want to delete this
              finding? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDeleteDialogOpen(false)
              }
              className="h-11 rounded-md md:h-9"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="h-11 rounded-md md:h-9"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}