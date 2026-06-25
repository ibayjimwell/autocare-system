'use client';

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Package, X } from "lucide-react";
import { findingsApi } from "@/lib/service-tracking/findings";
import { toast } from "sonner";

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

interface FindingModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  onSaved: () => void;
}

export default function FindingModal({ open, onClose, appointmentId, onSaved }: FindingModalProps) {
  const [findings, setFindings] = useState<Finding[]>([
    { id: Date.now().toString(), description: "", parts: [] },
  ]);
  const [saving, setSaving] = useState(false);

  const addFinding = () => {
    setFindings([...findings, { id: Date.now().toString(), description: "", parts: [] }]);
  };

  const removeFinding = (id: string) => {
    if (findings.length === 1) return;
    setFindings(findings.filter(f => f.id !== id));
  };

  const updateFindingDescription = (id: string, description: string) => {
    setFindings(findings.map(f => f.id === id ? { ...f, description } : f));
  };

  const addPart = (findingId: string) => {
    setFindings(findings.map(f => {
      if (f.id === findingId) {
        return {
          ...f,
          parts: [
            ...f.parts,
            { id: Date.now().toString(), partName: "", quantity: 1, priceAtTime: 0, isPms: false },
          ],
        };
      }
      return f;
    }));
  };

  const removePart = (findingId: string, partId: string) => {
    setFindings(findings.map(f => {
      if (f.id === findingId) {
        return {
          ...f,
          parts: f.parts.filter(p => p.id !== partId),
        };
      }
      return f;
    }));
  };

  const updatePart = (findingId: string, partId: string, field: keyof FindingPart, value: any) => {
    setFindings(findings.map(f => {
      if (f.id === findingId) {
        return {
          ...f,
          parts: f.parts.map(p => {
            if (p.id === partId) {
              return { ...p, [field]: field === 'isPms' ? value : field === 'quantity' ? parseInt(value) || 0 : value };
            }
            return p;
          }),
        };
      }
      return f;
    }));
  };

  const handleSave = async () => {
    // Validate: each finding must have a description
    const invalid = findings.some(f => !f.description.trim());
    if (invalid) {
      toast.error("Each finding must have a description.");
      return;
    }
    setSaving(true);
    try {
      // Prepare payload
      const payload = {
        appointmentId,
        findings: findings.map(f => ({
          description: f.description.trim(),
          parts: f.parts.map(p => ({
            partName: p.partName.trim() || undefined,
            quantity: p.quantity,
            priceAtTime: p.priceAtTime,
            isPms: p.isPms,
          })),
        })),
      };
      const res = await findingsApi.create(payload);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to record findings.");
      } else {
        toast.success("Findings recorded.");
        onSaved();
      }
    } catch (err: any) {
      toast.error(err.message || "Error recording findings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
          <DialogTitle className="text-xl font-bold tracking-tight">Record Findings</DialogTitle>
          <p className="text-sm text-muted-foreground">Add diagnostic observations and parts used.</p>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 space-y-6">
          {findings.map((finding, idx) => (
            <div key={finding.id} className="space-y-4 border rounded-xl p-4 relative">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Finding #{idx + 1}</h4>
                {findings.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeFinding(finding.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Description *
                </Label>
                <Textarea
                  value={finding.description}
                  onChange={(e) => updateFindingDescription(finding.id, e.target.value)}
                  placeholder="Describe the issue discovered..."
                  className="min-h-[60px]"
                />
              </div>

              {/* Parts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Parts & Supplies
                  </Label>
                  <Button variant="outline" size="sm" onClick={() => addPart(finding.id)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Part
                  </Button>
                </div>
                {finding.parts.map((part) => (
                  <div key={part.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-muted/30 p-3 rounded-lg relative">
                    <div className="col-span-1">
                      <Label className="text-[10px] font-bold uppercase">Part Name</Label>
                      <Input
                        value={part.partName}
                        onChange={(e) => updatePart(finding.id, part.id, 'partName', e.target.value)}
                        placeholder="e.g., Oil Filter"
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-[10px] font-bold uppercase">Qty</Label>
                      <Input
                        type="number"
                        value={part.quantity}
                        onChange={(e) => updatePart(finding.id, part.id, 'quantity', e.target.value)}
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
                        onChange={(e) => updatePart(finding.id, part.id, 'priceAtTime', parseFloat(e.target.value) || 0)}
                        className="h-9"
                        disabled={part.isPms}
                      />
                    </div>
                    <div className="col-span-1 flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Checkbox
                          checked={part.isPms}
                          onCheckedChange={(checked) => updatePart(finding.id, part.id, 'isPms', !!checked)}
                          id={`pms-${part.id}`}
                        />
                        <Label htmlFor={`pms-${part.id}`} className="text-xs font-bold">PMS</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removePart(finding.id, part.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground">
                  * Checking "PMS" sets the price to ₱0.00 (included in package).
                </div>
              </div>
              {idx < findings.length - 1 && <Separator className="my-2" />}
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={addFinding}>
            <Plus className="w-4 h-4 mr-2" /> Add Another Finding
          </Button>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/10 gap-3 shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Findings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}