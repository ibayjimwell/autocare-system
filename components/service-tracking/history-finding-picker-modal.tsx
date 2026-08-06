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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useHistoryFindings } from '@/hooks/service-tracking/useHistoryFindings';
import { Search, Loader2, User, Car } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface HistoryFindingPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFindings: (findings: Array<{ description: string; parts: Array<{ partName: string; quantity: number; priceAtTime: number; isPms: boolean }> }>) => Promise<void>;
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
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { findings, loading, loadFindings } = useHistoryFindings(search, phase);

  useEffect(() => {
    if (open) loadFindings();
  }, [open, loadFindings]);

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleAddSelected = async () => {
    const selected = findings.filter(f => selectedIds.has(f.id));
    if (selected.length === 0) {
      toast.warning('Please select at least one finding.');
      return;
    }
    const findingsToAdd = selected.map(f => ({
      description: f.description,
      parts: f.parts.map((p: any) => ({
        partName: p.partName,
        quantity: p.quantity,
        priceAtTime: parseFloat(p.priceAtTime),
        isPms: p.isPms,
      })),
    }));
    await onAddFindings(findingsToAdd);
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-xl font-bold">Add Findings from History</DialogTitle>
          <p className="text-sm text-muted-foreground">Previously recorded findings with parts</p>
        </DialogHeader>

        <div className="p-4 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search findings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Scrollable content – plain div with overflow-y-auto */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : findings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No findings in history.</p>
          ) : (
            <div className="space-y-4 pb-4">
              {findings.map((item) => (
                <div key={item.id} className="flex items-start gap-3 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`finding-${item.id}`}
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => handleToggle(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={`finding-${item.id}`} className="font-medium cursor-pointer">
                      {item.description}
                    </Label>
                    {item.parts && item.parts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.parts.map((p: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {p.quantity}x {p.partName} {p.isPms ? '(PMS)' : `₱${(parseFloat(p.priceAtTime) * p.quantity).toFixed(2)}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{item.customer?.fullname || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        <span>{item.vehicle?.make} {item.vehicle?.model} ({item.vehicle?.plateNumber})</span>
                      </div>
                      <div>{format(new Date(item.recordedAt), 'MMM d, yyyy')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAddSelected} disabled={isAdding || selectedIds.size === 0}>
            {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Add Selected ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}