'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useConfigurations } from '@/hooks/configurations/useConfigurations';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DateConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
}

export function DateConfigModal({ open, onOpenChange, date }: DateConfigModalProps) {
  const { config, loading, updateConfig } = useConfigurations();
  const dateStr = date ? format(date, 'yyyy-MM-dd') : '';

  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [reason, setReason] = useState('');
  const [capacity, setCapacity] = useState<number>(4);

  useEffect(() => {
    if (config && dateStr) {
      const override = config.dateOverrides[dateStr];
      if (override) {
        setOpeningTime(override.openingTime || config.global.openingTime);
        setClosingTime(override.closingTime || config.global.closingTime);
        setIsOpen(override.isOpen !== undefined ? override.isOpen : true);
        setReason(override.reason || '');
        setCapacity(override.capacity ?? config.global.capacity);
      } else {
        // Use global defaults
        setOpeningTime(config.global.openingTime);
        setClosingTime(config.global.closingTime);
        setIsOpen(true);
        setReason('');
        setCapacity(config.global.capacity);
      }
    }
  }, [config, dateStr]);

  const handleSave = async () => {
    if (!config || !dateStr) return;
    const newOverrides = { ...config.dateOverrides };
    if (isOpen) {
      // Store override if different from global
      newOverrides[dateStr] = {
        openingTime,
        closingTime,
        isOpen: true,
        capacity,
        reason: undefined,
      };
    } else {
      // Closed: store isOpen: false and reason
      newOverrides[dateStr] = {
        openingTime,
        closingTime,
        isOpen: false,
        reason: reason.trim() || 'Closed',
        capacity,
      };
    }
    const newConfig = {
      ...config,
      dateOverrides: newOverrides,
    };
    const success = await updateConfig(newConfig);
    if (success) {
      toast.success(`Configuration for ${format(date, 'MMM dd, yyyy')} updated.`);
      onOpenChange(false);
    } else {
      toast.error('Failed to update date configuration.');
    }
  };

  const handleReset = async () => {
    if (!config || !dateStr) return;
    const newOverrides = { ...config.dateOverrides };
    delete newOverrides[dateStr];
    const newConfig = {
      ...config,
      dateOverrides: newOverrides,
    };
    const success = await updateConfig(newConfig);
    if (success) {
      toast.success(`Override removed for ${format(date, 'MMM dd, yyyy')}.`);
      onOpenChange(false);
    } else {
      toast.error('Failed to reset date configuration.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Configure Date: {date ? format(date, 'MMM dd, yyyy') : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="isOpen">Shop Open</Label>
            <Switch id="isOpen" checked={isOpen} onCheckedChange={setIsOpen} />
          </div>
          {!isOpen && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="col-span-3"
                placeholder="Why is the shop closed?"
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dateOpening" className="text-right">
              Opening
            </Label>
            <Input
              id="dateOpening"
              type="time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dateClosing" className="text-right">
              Closing
            </Label>
            <Input
              id="dateClosing"
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dateCapacity" className="text-right">
              Capacity
            </Label>
            <Input
              id="dateCapacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleReset} disabled={loading}>
            Reset to Global
          </Button>
          <div>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}