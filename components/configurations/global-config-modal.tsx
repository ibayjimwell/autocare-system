'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfigurations } from '@/hooks/configurations/useConfigurations';
import { toast } from 'sonner';

interface GlobalConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalConfigModal({ open, onOpenChange }: GlobalConfigModalProps) {
  const { config, loading, updateConfig } = useConfigurations();
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [capacity, setCapacity] = useState<number>(4);

  useEffect(() => {
    if (config) {
      setOpeningTime(config.global.openingTime);
      setClosingTime(config.global.closingTime);
      setCapacity(config.global.capacity);
    }
  }, [config]);

  const handleSave = async () => {
    if (!config) return;
    const newConfig = {
      ...config,
      global: {
        openingTime,
        closingTime,
        capacity,
      },
    };
    const success = await updateConfig(newConfig);
    if (success) {
      toast.success('Global configuration updated.');
      onOpenChange(false);
    } else {
      toast.error('Failed to update global configuration.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Global Appointment Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="opening" className="text-right">
              Opening Time
            </Label>
            <Input
              id="opening"
              type="time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="closing" className="text-right">
              Closing Time
            </Label>
            <Input
              id="closing"
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="capacity" className="text-right">
              Vehicle Capacity
            </Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}