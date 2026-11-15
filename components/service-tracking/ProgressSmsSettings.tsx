'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock3, MessageSquareText, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Unit = 'minutes' | 'hours';
type SmsSettings = { enabled: boolean; intervalValue: number; intervalUnit: Unit };
const DEFAULTS: SmsSettings = { enabled: false, intervalValue: 10, intervalUnit: 'minutes' };

export default function ProgressSmsSettings() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<SmsSettings>(DEFAULTS);
  const [valueInput, setValueInput] = useState('10');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/service-progress-sms/settings', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.errorMessage || 'Unable to load settings.');
      const next: SmsSettings = result.data;
      setSettings(next);
      setValueInput(String(next.intervalValue));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load SMS settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) void load(); }, [open, load]);

  const save = async () => {
    const value = Number(valueInput);
    const max = settings.intervalUnit === 'hours' ? 24 : 1440;
    const min = settings.intervalUnit === 'hours' ? 1 : 5;
    if (!Number.isInteger(value) || value < min || value > max) {
      toast.error(`Choose ${min}–${max} ${settings.intervalUnit}.`);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/service-progress-sms/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, intervalValue: value }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.errorMessage || 'Unable to save SMS settings.');
      setSettings(result.data);
      toast.success(result.data.enabled ? 'Automatic progress SMS enabled.' : 'Automatic progress SMS disabled.');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save SMS settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" className="h-11 w-full gap-2 rounded-md sm:w-auto md:h-9"
        onClick={() => setOpen(true)}>
        <MessageSquareText className="h-4 w-4" aria-hidden="true" /> SMS Updates
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg rounded-xl border-border bg-card p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Settings2 className="h-5 w-5 text-primary" /> Customer Progress SMS
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Automatically send inspection and repair task updates to the customer's registered phone, even without the Mobile app.
            </DialogDescription>
          </DialogHeader>
          {loadError ? (
            <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
              {loadError}
              <Button variant="outline" className="ml-3" onClick={() => void load()}>Retry</Button>
            </div>
          ) : (
            <div className="space-y-5 py-3" aria-busy={loading}>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">Automatic SMS updates</span>
                  <span className="block text-xs text-muted-foreground">Only during Under Inspection and In Progress</span>
                </span>
                <input type="checkbox" checked={settings.enabled} disabled={loading || saving}
                  onChange={event => setSettings(current => ({ ...current, enabled: event.target.checked }))}
                  className="h-5 w-5 shrink-0 accent-[#C1272D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1272D]"
                  aria-label="Enable automatic progress SMS" />
              </label>
              <div className="space-y-2">
                <Label htmlFor="sms-interval" className="text-sm font-semibold">Send every</Label>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,130px)] gap-2">
                  <Input id="sms-interval" type="number" inputMode="numeric" min={settings.intervalUnit === 'minutes' ? 5 : 1}
                    max={settings.intervalUnit === 'minutes' ? 1440 : 24} step="1"
                    disabled={loading || saving} value={valueInput}
                    onChange={event => setValueInput(event.target.value)} className="h-11 text-base md:h-9 md:text-sm" />
                  <select className="h-11 rounded-md border border-input bg-background px-3 text-base focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:text-sm"
                    value={settings.intervalUnit} disabled={loading || saving}
                    onChange={event => { const unit = event.target.value as Unit; setSettings(current => ({ ...current, intervalUnit: unit })); setValueInput(unit === 'hours' ? '1' : '10'); }}
                    aria-label="Interval unit">
                    <option value="minutes">Minutes</option><option value="hours">Hours</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Messages include completed, ongoing, and pending task names. Checks run approximately every minute on Supabase; each customer is messaged at their configured interval. SMS fees and mobile network delivery depend on the connected httpSMS Android gateway.</p>
              </div>
              <p className="text-xs text-muted-foreground">Enable only after confirming customers have consented to recurring service updates. Changes take effect on the next scheduled check.</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} disabled={loading || saving || Boolean(loadError)}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
