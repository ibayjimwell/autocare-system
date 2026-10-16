'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2, Package, Plus } from 'lucide-react';
import { diagnosticLabel } from '@/lib/diagnostic-checklist/catalog';
import type { SuggestedFinding } from '@/hooks/diagnostic-checklist/useDiagnosticChecklist';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemKey: string | null;
  findings: SuggestedFinding[];
  loading: boolean;
  onAdd: (defaultFindingId: string) => Promise<void>;
  onFindingsChanged: () => void | Promise<void>;
}
export default function SuggestedFindingsModal({ open, onOpenChange, itemKey, findings, loading, onAdd, onFindingsChanged }: Props) {
  const [addingId, setAddingId] = useState<string | null>(null);
  const handleAdd = async (id: string) => {
    if (addingId) return;
    setAddingId(id);
    try {
      await onAdd(id);
      await onFindingsChanged();
      toast.success('Suggested finding added to this appointment.');
    } catch (error: any) { toast.error(error?.message || 'Unable to add suggested finding.'); }
    finally { setAddingId(null); }
  };
  return <Dialog open={open} onOpenChange={next => { if (!addingId) onOpenChange(next); }}>
    <DialogContent className="flex max-h-[86vh] w-[calc(100%-1rem)] max-w-xl flex-col overflow-hidden p-0">
      <DialogHeader className="border-b px-5 py-4">
        <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600"/><DialogTitle>Suggested Findings</DialogTitle></div>
        <DialogDescription className="pt-1">{itemKey ? diagnosticLabel(itemKey) : 'Checklist item'} was marked Warning or Replace. Add an applicable finding to the appointment’s Findings list.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-3 overflow-y-auto p-5">
        {loading ? <div className="flex min-h-36 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>
          : findings.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">No linked findings yet</p><p className="mt-1 text-sm text-muted-foreground">Link Default Findings to this checklist item in the Default Finding Library.</p></div>
          : findings.map(finding => <div key={finding.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1"><p className="font-semibold">{finding.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{finding.parts.length} attached part(s)</p>
                {finding.parts.length > 0 && <div className="mt-3 space-y-1.5 border-t pt-3">{finding.parts.map(part => <div key={part.id} className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="h-3.5 w-3.5 shrink-0"/><span>{part.quantity} × {part.partName}</span>{part.isPms && <Badge variant="secondary">PMS</Badge>}</div>)}</div>}
              </div>
              <Button size="sm" className="h-10 shrink-0 gap-2" variant={finding.added ? 'outline' : 'default'} disabled={finding.added || Boolean(addingId)} onClick={() => void handleAdd(finding.id)}>
                {finding.added ? <><CheckCircle2 className="h-4 w-4"/>Added</> : addingId === finding.id ? <><Loader2 className="h-4 w-4 animate-spin"/>Adding</> : <><Plus className="h-4 w-4"/>Add</>}
              </Button>
            </div>
          </div>)}
      </div>
      <div className="border-t p-4 text-right"><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></div>
    </DialogContent>
  </Dialog>;
}
