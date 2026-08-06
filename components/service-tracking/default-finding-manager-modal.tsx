'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
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
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
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
      const res = await defaultFindingsApi.list();
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load findings.');
      } else {
        setFindings(res.data || []);
      }
    } catch (err) {
      toast.error('Error loading findings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadFindings();
  }, [open]);

  const resetForm = () => {
    setFormData({ title: '', isActive: true, parts: [] });
    setEditingId(null);
  };

  const handleEdit = (finding: any) => {
    setEditingId(finding.id);
    setFormData({
      title: finding.title,
      isActive: finding.isActive,
      parts: finding.parts.map((p: any) => ({ ...p })),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this finding and its parts?')) return;
    try {
      const res = await defaultFindingsApi.delete(id);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to delete.');
      } else {
        toast.success('Deleted.');
        loadFindings();
      }
    } catch (err) {
      toast.error('Error deleting.');
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    try {
      const payload = {
        title: formData.title.trim(),
        isActive: formData.isActive,
        parts: formData.parts.map(p => ({
          partName: p.partName.trim(),
          quantity: p.quantity,
          priceAtTime: p.priceAtTime,
          isPms: p.isPms,
        })),
      };
      let res;
      if (editingId) {
        res = await defaultFindingsApi.update(editingId, payload);
      } else {
        res = await defaultFindingsApi.create(payload);
      }
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to save.');
      } else {
        toast.success(editingId ? 'Updated.' : 'Created.');
        resetForm();
        loadFindings();
        onSaved();
      }
    } catch (err) {
      toast.error('Error saving.');
    }
  };

  const addPart = () => {
    setFormData({
      ...formData,
      parts: [...formData.parts, { id: Date.now().toString(), partName: '', quantity: 1, priceAtTime: 0, isPms: false }],
    });
  };

  const removePart = (index: number) => {
    const newParts = [...formData.parts];
    newParts.splice(index, 1);
    setFormData({ ...formData, parts: newParts });
  };

  const updatePart = (index: number, field: keyof Part, value: any) => {
    const newParts = [...formData.parts];
    newParts[index] = { ...newParts[index], [field]: value };
    setFormData({ ...formData, parts: newParts });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="text-xl font-bold">Manage Default Findings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* List of existing findings */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Existing Findings</h4>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No default findings yet.</p>
            ) : (
              <div className="space-y-3">
                {findings.map((f) => (
                  <div key={f.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{f.parts.length} parts</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(f)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit / Create form */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {editingId ? 'Edit Finding' : 'Create Finding'}
            </h4>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Engine noise diagnosis"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>

              <div>
                <Label>Parts</Label>
                <div className="space-y-2 mt-2">
                  {formData.parts.map((part, idx) => (
                    <div key={part.id} className="flex gap-2 items-center">
                      <Input
                        value={part.partName}
                        onChange={(e) => updatePart(idx, 'partName', e.target.value)}
                        placeholder="Part name"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={part.quantity}
                        onChange={(e) => updatePart(idx, 'quantity', parseInt(e.target.value) || 1)}
                        placeholder="Qty"
                        className="w-20"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={part.priceAtTime}
                        onChange={(e) => updatePart(idx, 'priceAtTime', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        className="w-24"
                        disabled={part.isPms}
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={part.isPms}
                          onChange={(e) => updatePart(idx, 'isPms', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs">PMS</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removePart(idx)}>
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addPart}>
                    <Plus className="w-4 h-4 mr-1" /> Add Part
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}