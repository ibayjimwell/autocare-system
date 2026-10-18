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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck,
  Edit2,
  FileSearch,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import InventoryPicker from '@/components/inventory/inventory-picker';
import { defaultFindingsApi } from '@/lib/service-tracking/default-findings';
import { diagnosticChecklistApi } from '@/lib/diagnostic-checklist/diagnostic-checklists';
import { DIAGNOSTIC_SECTIONS } from '@/lib/diagnostic-checklist/catalog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface PartForm {
  id?: string;
  inventoryItemId?: string | null;
  partName: string;
  quantity: number;
  priceAtTime: number;
  isPms: boolean;
}

interface FindingForm {
  title: string;
  parts: PartForm[];
  checklistKeys: string[];
}

interface FindingLink {
  itemKey: string;
  defaultFindingId: string;
}

const emptyForm = (): FindingForm => ({
  title: '',
  parts: [],
  checklistKeys: [],
});

export default function DefaultFindingManagerModal({
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [checklistSearch, setChecklistSearch] = useState('');
  const [findingLinks, setFindingLinks] = useState<FindingLink[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FindingForm>(emptyForm());

  const load = async () => {
    setLoading(true);
    try {
      const [res, linksRes] = await Promise.all([
        defaultFindingsApi.list(),
        diagnosticChecklistApi.listLinks(),
      ]);

      if (res?.error) {
        throw new Error(res.errorMessage || 'Failed to load default findings.');
      }

      if (linksRes?.error) {
        throw new Error(linksRes.errorMessage || 'Failed to load checklist links.');
      }

      setFindings(Array.isArray(res?.data) ? res.data : []);
      setFindingLinks(Array.isArray(linksRes?.data) ? linksRes.data : []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load default findings.');
      setFindings([]);
      setFindingLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // Intentionally load on dialog opening, not on every form state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return findings;

    return findings.filter((finding) =>
      [
        finding?.title,
        ...(finding?.parts || []).map((part: any) => part?.partName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [findings, search]);

  const checklistLinkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of findingLinks) {
      counts.set(
        link.defaultFindingId,
        (counts.get(link.defaultFindingId) || 0) + 1,
      );
    }
    return counts;
  }, [findingLinks]);

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
    setChecklistSearch('');
  };

  const toggleChecklistKey = (key: string) => {
    setForm((current) => ({
      ...current,
      checklistKeys: current.checklistKeys.includes(key)
        ? current.checklistKeys.filter((value) => value !== key)
        : [...current.checklistKeys, key],
    }));
  };

  const edit = (finding: any) => {
    setEditingId(finding.id);
    setForm({
      title: String(finding?.title || ''),
      checklistKeys: findingLinks
        .filter((link) => link.defaultFindingId === finding.id)
        .map((link) => link.itemKey),
      parts: (Array.isArray(finding?.parts) ? finding.parts : []).map(
        (part: any) => ({
          id: part.id,
          inventoryItemId: part.inventoryItemId || null,
          partName: String(part?.partName || ''),
          quantity: Math.max(1, Number(part?.quantity) || 1),
          priceAtTime: Math.max(0, Number(part?.priceAtTime) || 0),
          isPms: Boolean(part?.isPms),
        }),
      ),
    });
  };

  const addPart = () => {
    setForm((current) => ({
      ...current,
      parts: [
        ...current.parts,
        {
          id: `new-${Date.now()}-${current.parts.length}`,
          inventoryItemId: null,
          partName: '',
          quantity: 1,
          priceAtTime: 0,
          isPms: false,
        },
      ],
    }));
  };

  const changePart = (index: number, patch: Partial<PartForm>) => {
    setForm((current) => ({
      ...current,
      parts: current.parts.map((part, partIndex) =>
        partIndex === index ? { ...part, ...patch } : part,
      ),
    }));
  };

  const removePart = (index: number) => {
    setForm((current) => ({
      ...current,
      parts: current.parts.filter((_, partIndex) => partIndex !== index),
    }));
  };

  const save = async () => {
    if (saving) return;

    const title = form.title.trim();
    if (!title) {
      toast.error('Finding title is required.');
      return;
    }

    const parts = form.parts
      .map((part) => ({
        inventoryItemId: part.inventoryItemId || null,
        partName: part.partName.trim(),
        quantity: Math.max(1, Number(part.quantity) || 1),
        priceAtTime: part.isPms
          ? 0
          : Math.max(0, Number(part.priceAtTime) || 0),
        isPms: Boolean(part.isPms),
      }))
      .filter((part) => part.partName);

    setSaving(true);
    try {
      const wasEditing = Boolean(editingId);
      const res = editingId
        ? await defaultFindingsApi.update(editingId, { title, parts })
        : await defaultFindingsApi.create({ title, parts });

      if (res?.error) {
        throw new Error(res.errorMessage || 'Could not save default finding.');
      }

      const savedId = editingId || res?.data?.id;
      if (!savedId) {
        throw new Error('Saved finding ID is missing.');
      }

      // If checklist linking fails after creation, editingId is kept so a
      // retry updates the saved finding rather than creating a duplicate.
      setEditingId(savedId);
      const linkResult = await diagnosticChecklistApi.saveFindingLinks(
        savedId,
        form.checklistKeys,
      );
      if (linkResult?.error) {
        throw new Error(linkResult.errorMessage || 'Could not save checklist links.');
      }

      toast.success(wasEditing ? 'Default finding updated.' : 'Default finding added.');
      reset();
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'Could not save default finding.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (
      !window.confirm(
        'Delete this default finding? This does not remove findings already copied to appointments.',
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await defaultFindingsApi.delete(id);
      if (res?.error) {
        throw new Error(res.errorMessage || 'Could not delete default finding.');
      }

      toast.success('Default finding deleted.');
      if (editingId === id) reset();
      await load();
      onSaved();
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete default finding.');
    } finally {
      setDeletingId(null);
    }
  };

  const canInteract = !saving && !deletingId;
  const normalizedChecklistSearch = checklistSearch.trim().toLowerCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="
          !flex
          !h-[min(92dvh,920px)]
          !max-h-[92dvh]
          !w-[calc(100vw-1rem)]
          !max-w-[1450px]
          sm:!w-[calc(100vw-2rem)]
          lg:!w-[94vw]
          xl:!w-[90vw]
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
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileSearch className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Default Finding Library
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl text-xs leading-5 sm:text-sm">
                Create reusable findings, attach inventory parts, and link vehicle
                components from the Diagnostic Checklist.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
          <div className="grid gap-4 p-3 sm:p-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.25fr)] lg:gap-5 lg:p-5">
            {/* LEFT: existing finding library */}
            <section className="min-w-0 rounded-xl border border-border bg-background lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
              <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Saved Findings</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select a finding to review or edit its details.
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {visible.length} shown
                  </Badge>
                </div>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search findings or attached parts..."
                    className="h-11 rounded-md pl-10 md:h-9"
                    aria-label="Search default findings"
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                {loading ? (
                  <div className="flex min-h-52 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : visible.length === 0 ? (
                  <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-border px-5 text-center">
                    <FileSearch className="h-7 w-7 text-muted-foreground" />
                    <p className="mt-3 text-sm font-semibold">No default findings found</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Create your first finding or change the search term.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visible.map((finding) => {
                      const isEditing = editingId === finding.id;
                      const partsCount = Array.isArray(finding.parts)
                        ? finding.parts.length
                        : 0;
                      const linksCount = checklistLinkCounts.get(finding.id) || 0;

                      return (
                        <div
                          key={finding.id}
                          className={cn(
                            'rounded-lg border bg-card p-3.5 transition-colors sm:p-4',
                            isEditing
                              ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/10'
                              : 'border-border hover:border-primary/30',
                          )}
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <ClipboardCheck className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-semibold leading-5 text-foreground">
                                  {finding.title}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <Badge variant="secondary" className="rounded-md text-[10px]">
                                    {partsCount} part{partsCount === 1 ? '' : 's'}
                                  </Badge>
                                  <Badge variant="outline" className="rounded-md text-[10px]">
                                    {linksCount} checklist link{linksCount === 1 ? '' : 's'}
                                  </Badge>
                                </div>
                                {partsCount > 0 && (
                                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                    {finding.parts
                                      .map((part: any) => part.partName)
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                disabled={!canInteract}
                                onClick={() => edit(finding)}
                                aria-label={`Edit ${finding.title}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-destructive hover:text-destructive"
                                disabled={!canInteract}
                                onClick={() => void remove(finding.id)}
                                aria-label={`Delete ${finding.title}`}
                              >
                                {deletingId === finding.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* RIGHT: finding editor */}
            <section className="min-w-0 rounded-xl border border-border bg-background lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {editingId ? 'Edit Default Finding' : 'Create Default Finding'}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Configure the finding, parts and diagnostic suggestions.
                  </p>
                </div>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    disabled={saving}
                    className="h-9"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    New Finding
                  </Button>
                )}
              </div>

              <div className="space-y-5 p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                <div>
                  <Label htmlFor="default-finding-title" className="text-sm font-semibold">
                    Finding title
                  </Label>
                  <Input
                    id="default-finding-title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="e.g. Worn front brake pads"
                    className="mt-2 h-11 md:h-9"
                  />
                </div>

                {/* Diagnostic checklist links keep existing logic intact. */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">
                        Diagnostic Checklist Links
                      </h4>
                    </div>
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      {form.checklistKeys.length} linked
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Marking a linked component as Warning or Replace will suggest
                    this finding. Unlinked findings remain available in the manual picker.
                  </p>

                  <div className="relative mt-4">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={checklistSearch}
                      onChange={(event) => setChecklistSearch(event.target.value)}
                      placeholder="Search checklist components..."
                      className="h-10 pl-10"
                      aria-label="Search diagnostic checklist components"
                    />
                  </div>

                  <div className="mt-3 max-h-64 space-y-4 overflow-y-auto rounded-lg border border-border bg-background p-3">
                    {DIAGNOSTIC_SECTIONS.map((section) => {
                      const items = section.items.filter(
                        ([, label]) =>
                          label.toLowerCase().includes(normalizedChecklistSearch) ||
                          section.title.toLowerCase().includes(normalizedChecklistSearch),
                      );
                      if (items.length === 0) return null;

                      return (
                        <div key={section.id}>
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            {section.title}
                          </p>
                          <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
                            {items.map(([key, label]) => (
                              <label
                                key={key}
                                className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={form.checklistKeys.includes(key)}
                                  onCheckedChange={() => toggleChecklistKey(key)}
                                  className="mt-0.5 shrink-0"
                                />
                                <span className="min-w-0 break-words leading-5">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {form.checklistKeys.length} checklist item(s) linked
                  </p>
                </div>

                {/* Parts editor */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Attached Parts</h4>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Pick an inventory item to retain its stock reference.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPart}
                      className="h-10 md:h-9"
                      disabled={saving}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Part
                    </Button>
                  </div>

                  {form.parts.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center">
                      <Package className="mx-auto h-6 w-6 text-muted-foreground" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        No parts attached. Parts are optional.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {form.parts.map((part, index) => (
                        <div
                          key={part.id || index}
                          className="rounded-lg border border-border bg-background p-3 sm:p-4"
                        >
                          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_100px_125px_auto]">
                            <div className="min-w-0 sm:col-span-1">
                              <Label className="text-xs">Part</Label>
                              <div className="mt-1.5 flex min-w-0 gap-2">
                                <Input
                                  value={part.partName}
                                  onChange={(event) =>
                                    changePart(index, {
                                      partName: event.target.value,
                                      inventoryItemId: null,
                                    })
                                  }
                                  placeholder="Part name"
                                  className="min-w-0 flex-1"
                                />
                                <InventoryPicker
                                  onSelect={(item) =>
                                    changePart(index, {
                                      inventoryItemId: item.id,
                                      partName: item.name,
                                      priceAtTime: item.price,
                                    })
                                  }
                                >
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title="Pick from inventory"
                                    className="h-9 w-9 shrink-0"
                                  >
                                    <Package className="h-4 w-4" />
                                  </Button>
                                </InventoryPicker>
                              </div>
                              {part.inventoryItemId && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Linked to inventory
                                </p>
                              )}
                            </div>

                            <div>
                              <Label className="text-xs">Qty</Label>
                              <Input
                                type="number"
                                min={1}
                                value={part.quantity}
                                onChange={(event) =>
                                  changePart(index, { quantity: Number(event.target.value) })
                                }
                                className="mt-1.5"
                              />
                            </div>

                            <div>
                              <Label className="text-xs">Price</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                disabled={part.isPms}
                                value={part.isPms ? 0 : part.priceAtTime}
                                onChange={(event) =>
                                  changePart(index, {
                                    priceAtTime: Number(event.target.value),
                                  })
                                }
                                className="mt-1.5"
                              />
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePart(index)}
                              aria-label={`Remove part ${index + 1}`}
                              className="h-9 w-9 self-end text-muted-foreground hover:text-destructive"
                              disabled={saving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                              checked={part.isPms}
                              onCheckedChange={(checked) =>
                                changePart(index, {
                                  isPms: checked === true,
                                  priceAtTime: checked === true ? 0 : part.priceAtTime,
                                })
                              }
                            />
                            PMS / included at ₱0.00
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            disabled={saving}
            className="h-11 w-full sm:w-auto md:h-9"
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="h-11 w-full sm:w-auto md:h-9"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : editingId ? (
              'Save Changes'
            ) : (
              'Add Default Finding'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
