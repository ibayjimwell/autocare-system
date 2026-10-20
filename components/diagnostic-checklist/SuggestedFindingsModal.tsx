'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  Search,
  X,
  Trash2,
  ArrowLeft,
  ClipboardCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InventoryPicker from '@/components/inventory/inventory-picker';
import { diagnosticLabel } from '@/lib/diagnostic-checklist/catalog';
import type { NewLinkedFindingInput, NewLinkedFindingPart } from '@/lib/diagnostic-checklist/diagnostic-checklists';
import type { SuggestedFinding } from '@/hooks/diagnostic-checklist/useDiagnosticChecklist';
import { toast } from 'sonner';

interface CreatedFinding {
  id: string;
  title: string;
  itemKey: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemKey: string | null;
  findings: SuggestedFinding[];
  loading: boolean;
  onAdd: (defaultFindingId: string, itemKey: string) => Promise<void>;
  onCreate: (itemKey: string, input: NewLinkedFindingInput) => Promise<CreatedFinding>;
  onFindingsChanged: () => void | Promise<void>;
}

function emptyPart(): NewLinkedFindingPart {
  return {
    inventoryItemId: null,
    partName: '',
    quantity: 1,
    priceAtTime: 0,
    isPms: false,
  };
}

/**
 * Not a modal dialog: the Suggested Findings UI is a docked side/bottom panel
 * INSIDE DiagnosticChecklistModal. It has no backdrop and does not trap focus.
 * Staff can continue checking other items while this panel is visible.
 * Only the explicit add-to-appointment confirmation uses a real dialog.
 */
export default function SuggestedFindingsModal({
  open,
  onOpenChange,
  itemKey,
  findings,
  loading,
  onAdd,
  onCreate,
  onFindingsChanged,
}: Props) {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [parts, setParts] = useState<NewLinkedFindingPart[]>([]);
  const [saving, setSaving] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [pendingCreated, setPendingCreated] = useState<CreatedFinding | null>(null);

  // The panel changes context when staff selects a different Warning/Replace.
  // Avoid accidentally saving a form for the previous checklist component.
  useEffect(() => {
    setSearch('');
    setCreating(false);
    setTitle('');
    setParts([]);
  }, [itemKey]);

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setSearch('');
      setTitle('');
      setParts([]);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return findings;
    return findings.filter(finding => [
      finding.title,
      ...finding.parts.map(part => part.partName),
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [findings, search]);

  const updatePart = (index: number, patch: Partial<NewLinkedFindingPart>) => {
    setParts(current => current.map((part, at) => at === index ? { ...part, ...patch } : part));
  };

  const handleAdd = async (id: string, forItemKey: string) => {
    if (addingId || saving) return;
    setAddingId(id);
    try {
      await onAdd(id, forItemKey);
      await onFindingsChanged();
      toast.success('Finding added to the current appointment.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to add the finding to this appointment.');
      throw error;
    } finally {
      setAddingId(null);
    }
  };

  const handleCreate = async () => {
    if (!itemKey || saving || addingId) return;
    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
      toast.error('Enter a name for the new Default Finding.');
      return;
    }
    const normalizedParts = parts.map(part => ({
      inventoryItemId: part.inventoryItemId || null,
      partName: part.partName.trim(),
      quantity: Number(part.quantity),
      priceAtTime: part.isPms ? 0 : Number(part.priceAtTime),
      isPms: Boolean(part.isPms),
    }));
    if (normalizedParts.some(part =>
      !part.partName ||
      !Number.isInteger(part.quantity) || part.quantity < 1 ||
      !Number.isFinite(part.priceAtTime) || part.priceAtTime < 0
    )) {
      toast.error('Complete the name, quantity and price for every attached part.');
      return;
    }

    setSaving(true);
    try {
      // Server transaction creates DefaultFindings, DefaultFindingParts
      // and DiagnosticFindingLinks, but NOT InspectionFindings.
      const created = await onCreate(itemKey, {
        title: cleanedTitle,
        parts: normalizedParts,
      });
      setCreating(false);
      setTitle('');
      setParts([]);
      setSearch('');
      toast.success('Default Finding saved and linked to ' + diagnosticLabel(itemKey) + '.');
      // The separate confirmation explicitly controls the appointment copy.
      setPendingCreated(created);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to save the linked Default Finding.');
    } finally {
      setSaving(false);
    }
  };

  const confirmAppointmentAdd = async () => {
    if (!pendingCreated) return;
    const created = pendingCreated;
    try {
      await handleAdd(created.id, created.itemKey);
      setPendingCreated(null);
    } catch {
      // Keep the confirmation open so the staff member can retry or choose No.
    }
  };

  if (!open || !itemKey) return null;

  return (
    <>
      <aside
        role="region"
        aria-label={`Suggested findings for ${diagnosticLabel(itemKey)}`}
        className="flex h-full min-h-0 flex-col overflow-hidden border-t border-border bg-card shadow-[0_-5px_20px_rgba(0,0,0,0.07)] lg:border-l lg:border-t-0 lg:shadow-[-5px_0_22px_rgba(0,0,0,0.07)]"
      >
        <div className="shrink-0 border-b bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <h3 className="font-semibold text-foreground">Suggested Findings</h3>
              </div>
              <p className="mt-1 break-words text-xs font-semibold text-amber-800 dark:text-amber-300">
                {diagnosticLabel(itemKey)}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Linked to this Warning/Replace item. You can keep using the checklist while this panel stays open.
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              onClick={() => onOpenChange(false)}
              disabled={saving || Boolean(addingId)}
              aria-label="Close suggestions panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {creating ? (
            <>
              <div className="shrink-0 border-b px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-2 h-8 px-2"
                  onClick={() => setCreating(false)}
                  disabled={saving}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to suggestions
                </Button>
                <p className="font-semibold">New Default Finding</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Will be linked automatically to {diagnosticLabel(itemKey)}.
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <div>
                  <Label htmlFor="suggested-new-finding-title">Finding name</Label>
                  <Input
                    id="suggested-new-finding-title"
                    className="mt-1 h-10"
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    maxLength={250}
                    placeholder={`e.g. ${diagnosticLabel(itemKey)} needs replacement`}
                    disabled={saving}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Attached parts</p>
                    <p className="text-xs text-muted-foreground">Optional; link stock items or name parts manually.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => setParts(current => [...current, emptyPart()])}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Part
                  </Button>
                </div>
                {parts.map((part, index) => (
                  <div key={index} className="space-y-3 rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">Part {index + 1}</p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={saving}
                        onClick={() => setParts(current => current.filter((_, at) => at !== index))}
                        aria-label={`Remove part ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={part.partName}
                        onChange={event => updatePart(index, { partName: event.target.value, inventoryItemId: null })}
                        placeholder="Part name"
                        disabled={saving}
                        className="min-w-0 flex-1"
                      />
                      <InventoryPicker onSelect={item => updatePart(index, {
                        inventoryItemId: item.id,
                        partName: item.name,
                        priceAtTime: Number(item.price) || 0,
                      })}>
                        <Button type="button" size="icon" variant="outline" disabled={saving} title="Pick from inventory">
                          <Package className="h-4 w-4" />
                        </Button>
                      </InventoryPicker>
                    </div>
                    {part.inventoryItemId && <p className="text-xs text-muted-foreground">Linked to inventory</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min="1"
                          step="1"
                          value={part.quantity}
                          onChange={event => updatePart(index, { quantity: Number(event.target.value) })}
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Price (₱)</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min="0"
                          step="0.01"
                          value={part.isPms ? 0 : part.priceAtTime}
                          onChange={event => updatePart(index, { priceAtTime: Number(event.target.value) })}
                          disabled={saving || part.isPms}
                        />
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox
                        checked={part.isPms}
                        onCheckedChange={value => updatePart(index, {
                          isPms: value === true,
                          priceAtTime: value === true ? 0 : part.priceAtTime,
                        })}
                        disabled={saving}
                      />
                      PMS / included at ₱0.00
                    </label>
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t bg-card p-3">
                <Button
                  type="button"
                  className="h-11 w-full"
                  disabled={saving || Boolean(addingId) || !title.trim()}
                  onClick={() => void handleCreate()}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {saving ? 'Saving and linking...' : 'Save Linked Default Finding'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="shrink-0 space-y-2 border-b p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search suggested findings by name or part"
                    placeholder="Search finding name or part..."
                    className="h-10 pl-10"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {filtered.length} matching {filtered.length === 1 ? 'finding' : 'findings'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 gap-1.5"
                    disabled={saving || Boolean(addingId)}
                    onClick={() => setCreating(true)}
                  >
                    <Plus className="h-4 w-4" /> New Finding
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex min-h-28 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center">
                    <ClipboardCheck className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-sm font-semibold">{search ? 'No matches' : 'No linked findings yet'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {search ? 'Try another name or create a new finding.' : 'Create a finding here to link it to this checklist component.'}
                    </p>
                  </div>
                ) : filtered.map(finding => (
                  <div key={finding.id} className="rounded-xl border bg-background p-3">
                    <p className="break-words text-sm font-semibold">{finding.title}</p>
                    {finding.parts.length ? (
                      <div className="mt-2 space-y-1 border-t pt-2">
                        {finding.parts.map(part => (
                          <p key={part.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="h-3 w-3 shrink-0" />
                            <span>{part.quantity} × {part.partName}</span>
                            {part.isPms && <Badge variant="secondary" className="ml-auto text-[10px]">PMS</Badge>}
                          </p>
                        ))}
                      </div>
                    ) : <p className="mt-1 text-xs text-muted-foreground">No attached parts</p>}
                    <Button
                      type="button"
                      className="mt-3 h-9 w-full"
                      size="sm"
                      variant={finding.added ? 'outline' : 'default'}
                      disabled={finding.added || Boolean(addingId) || saving}
                      onClick={() => void handleAdd(finding.id, itemKey).catch(() => {})}
                    >
                      {finding.added ? <><CheckCircle2 className="mr-1.5 h-4 w-4" />Already in appointment</>
                        : addingId === finding.id ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Adding...</>
                          : <><Plus className="mr-1.5 h-4 w-4" />Add to this appointment</>}
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>

      <Dialog
        open={Boolean(pendingCreated)}
        onOpenChange={next => { if (!next && !addingId) setPendingCreated(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Finding to Current Appointment?</DialogTitle>
            <DialogDescription>
              <strong>{pendingCreated?.title}</strong> was saved in Default Findings and linked to
              {' '}<strong>{pendingCreated ? diagnosticLabel(pendingCreated.itemKey) : ''}</strong>.
              Add this finding and its parts to the current appointment's Findings list now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={Boolean(addingId)} onClick={() => setPendingCreated(null)}>
              No, Save as Default Only
            </Button>
            <Button type="button" disabled={Boolean(addingId)} onClick={() => void confirmAppointmentAdd()}>
              {addingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Yes, Add to Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
