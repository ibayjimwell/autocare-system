'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Package, Pencil, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { findingsApi } from "@/lib/service-tracking/findings";
import { cn } from "@/lib/utils";

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
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    description: "",
    parts: [] as FindingPart[],
  });

  const openEdit = (finding: Finding) => {
    setEditingFinding(finding);
    setEditForm({
      description: finding.description,
      parts: JSON.parse(JSON.stringify(finding.parts || [])),
    });
    setEditModalOpen(true);
  };

  const handleEditPartChange = (partId: string, field: keyof FindingPart, value: any) => {
    setEditForm((prev) => ({
      ...prev,
      parts: prev.parts.map((p) => {
        if (p.id === partId) {
          return { ...p, [field]: field === 'isPms' ? !!value : value };
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
        { id: Date.now().toString(), partName: "", quantity: 1, priceAtTime: 0, isPms: false },
      ],
    }));
  };

  const removePartFromEdit = (partId: string) => {
    setEditForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((p) => p.id !== partId),
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingFinding) return;
    if (!editForm.description.trim()) {
      toast.error("Finding description is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: editForm.description.trim(),
        parts: editForm.parts.map((p) => ({
          id: p.id.startsWith('temp') ? undefined : p.id,
          partName: p.partName.trim() || undefined,
          quantity: p.quantity,
          priceAtTime: p.priceAtTime,
          isPms: p.isPms,
        })),
      };
      const res = await findingsApi.update(editingFinding.id, payload);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to update finding.");
      } else {
        toast.success("Finding updated.");
        setEditModalOpen(false);
        onFindingsUpdated();
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating finding.");
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
      const res = await findingsApi.delete(deletingId);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to delete finding.");
      } else {
        toast.success("Finding deleted.");
        setDeleteDialogOpen(false);
        onFindingsUpdated();
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting finding.");
    } finally {
      setDeletingId(null);
    }
  };

  if (findings.length === 0) return null;

  return (
    <>
      <div className="bg-card border shadow-sm rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Recorded Findings
          </h4>
          <span className="text-xs text-muted-foreground">{findings.length} finding(s)</span>
        </div>
        <div className="space-y-3">
          {findings.map((finding) => (
            <div
              key={finding.id}
              className="bg-muted/30 border rounded-xl p-4 space-y-2 transition-all hover:border-primary/20"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1">{finding.description}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(finding)}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(finding.id)}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {finding.parts && finding.parts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {finding.parts.map((part, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-medium",
                        part.isPms && "border-green-200 bg-green-50 text-green-700"
                      )}
                    >
                      <Package className="w-3 h-3 mr-1" />
                      {part.quantity}x {part.partName || "Part"}
                      {!part.isPms && ` ₱${(part.priceAtTime * part.quantity).toFixed(2)}`}
                      {part.isPms && " (PMS)"}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
            <DialogTitle className="text-xl font-bold">Edit Finding</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Description *
                </Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="min-h-[80px] rounded-xl"
                  placeholder="Describe the finding..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Parts & Supplies
                  </Label>
                  <Button variant="outline" size="sm" onClick={addPartToEdit}>
                    <Plus className="w-3 h-3 mr-1" /> Add Part
                  </Button>
                </div>
                {editForm.parts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No parts added.</p>
                ) : (
                  <div className="space-y-3">
                    {editForm.parts.map((part) => (
                      <div
                        key={part.id}
                        className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-muted/30 p-3 rounded-lg relative"
                      >
                        <div className="col-span-1">
                          <Label className="text-[10px] font-bold uppercase">Part Name</Label>
                          <Input
                            value={part.partName}
                            onChange={(e) => handleEditPartChange(part.id, 'partName', e.target.value)}
                            placeholder="e.g., Oil Filter"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-1">
                          <Label className="text-[10px] font-bold uppercase">Qty</Label>
                          <Input
                            type="number"
                            value={part.quantity}
                            onChange={(e) => handleEditPartChange(part.id, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-1">
                          <Label className="text-[10px] font-bold uppercase">Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={part.priceAtTime}
                            onChange={(e) => handleEditPartChange(part.id, 'priceAtTime', parseFloat(e.target.value) || 0)}
                            className="h-9"
                            disabled={part.isPms}
                          />
                        </div>
                        <div className="col-span-1 flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Checkbox
                              checked={part.isPms}
                              onCheckedChange={(checked) => handleEditPartChange(part.id, 'isPms', !!checked)}
                              id={`pms-${part.id}`}
                            />
                            <Label htmlFor={`pms-${part.id}`} className="text-xs font-bold">PMS</Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removePartFromEdit(part.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  * Checking "PMS" sets the price to ₱0.00 (included in package).
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 border-t bg-muted/10 gap-3 shrink-0">
            <Button variant="ghost" onClick={() => setEditModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black">Delete Finding</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this finding? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}