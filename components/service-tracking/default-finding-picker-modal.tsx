'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDefaultFindings } from '@/hooks/service-tracking/useDefaultFindings';
import { Loader2 } from 'lucide-react';

interface DefaultFindingPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (finding: any) => void;
}

export default function DefaultFindingPickerModal({
  open,
  onOpenChange,
  onSelect,
}: DefaultFindingPickerModalProps) {
  const { findings, loading, loadFindings } = useDefaultFindings();

  // Reload findings whenever the modal opens
  useEffect(() => {
    if (open) {
      loadFindings();
    }
  }, [open, loadFindings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Choose Default Finding</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-60">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : findings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No default findings.</p>
          ) : (
            <div className="space-y-2 p-1">
              {findings.map((f) => (
                <Button
                  key={f.id}
                  variant="outline"
                  className="w-full justify-start text-left font-medium h-auto py-3 px-4 rounded-xl"
                  onClick={() => onSelect(f)}
                >
                  <div>
                    <div className="font-medium">{f.title}</div>
                    {f.parts && f.parts.length > 0 && (
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-1 mt-1">
                        {f.parts.map((p: any, i: number) => (
                          <span key={i} className="bg-muted px-1 py-0.5 rounded">
                            {p.quantity}x {p.partName} {p.isPms ? '(PMS)' : `₱${(parseFloat(p.priceAtTime) * p.quantity).toFixed(2)}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}