// components/staffs/access-modals.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import LoadingSpinner from '@/components/shared/loading-spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MODULES, MODULE_LABELS } from '@/app-utils/staffs/constants';
import { accessApi } from '@/lib/staffs/access';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AccessModalsProps {
  accessModalOpen: boolean;
  setAccessModalOpen: (open: boolean) => void;
  editAccessModalOpen: boolean;
  setEditAccessModalOpen: (open: boolean) => void;
  staffIdForAccess: string | null;
  onAccessChanged: () => void;
  highlight: (id: string) => void;
}

export default function AccessModals({
  accessModalOpen,
  setAccessModalOpen,
  editAccessModalOpen,
  setEditAccessModalOpen,
  staffIdForAccess,
  onAccessChanged,
  highlight,
}: AccessModalsProps) {
  // ---- New access assignment state ----
  const [accessPermissions, setAccessPermissions] = useState<Record<string, boolean>>({});
  const [savingAccess, setSavingAccess] = useState(false);

  // ---- Edit access state ----
  const [editAccessPermissions, setEditAccessPermissions] = useState<Record<string, boolean>>({});
  const [editAccessLoading, setEditAccessLoading] = useState(false);
  const [savingEditAccess, setSavingEditAccess] = useState(false);
  const [isNewAccess, setIsNewAccess] = useState(false);

  // Reset permissions when the creation modal opens
  useEffect(() => {
    if (accessModalOpen) {
      const initial: Record<string, boolean> = {};
      MODULES.forEach(mod => { initial[mod] = false; });
      setAccessPermissions(initial);
    }
  }, [accessModalOpen]);

  // Load existing access for the edit modal
  useEffect(() => {
    if (editAccessModalOpen && staffIdForAccess) {
      (async () => {
        setEditAccessLoading(true);
        try {
          const res = await accessApi.get(staffIdForAccess);
          if (res.error || !res.data) {
            setIsNewAccess(true);
            const initial: Record<string, boolean> = {};
            MODULES.forEach(mod => { initial[mod] = false; });
            setEditAccessPermissions(initial);
          } else {
            setIsNewAccess(false);
            const perms: Record<string, boolean> = {};
            MODULES.forEach(mod => { perms[mod] = res.data[mod] === true; });
            setEditAccessPermissions(perms);
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load access permissions.');
        } finally {
          setEditAccessLoading(false);
        }
      })();
    }
  }, [editAccessModalOpen, staffIdForAccess]);

  // ----- SAVE HANDLERS (they are called directly, not via DataModal) -----
  const handleSaveAccess = async () => {
    if (!staffIdForAccess) {
      toast.error('No staff selected.');
      return;
    }

    // Build the payload (only booleans)
    const payload = Object.fromEntries(
      Object.entries(accessPermissions).map(([k, v]) => [k, v === true])
    );

    console.log('Saving access for staff:', staffIdForAccess, payload);

    setSavingAccess(true);
    try {
      await accessApi.create(staffIdForAccess, payload);
      toast.success('Access permissions assigned.');
      setAccessModalOpen(false);
      onAccessChanged();
      if (staffIdForAccess) highlight(staffIdForAccess);
    } catch (err: any) {
      console.error('Create access error:', err);
      toast.error(err.message || 'Failed to assign access.');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleSaveEditAccess = async () => {
    if (!staffIdForAccess) {
      toast.error('No staff selected.');
      return;
    }

    const payload = Object.fromEntries(
      Object.entries(editAccessPermissions).map(([k, v]) => [k, v === true])
    );

    console.log('Saving edited access for staff:', staffIdForAccess, payload);

    setSavingEditAccess(true);
    try {
      let res;
      if (isNewAccess) {
        res = await accessApi.create(staffIdForAccess, payload);
      } else {
        res = await accessApi.update(staffIdForAccess, payload);
      }
      toast.success('Access permissions saved successfully.');
      setEditAccessModalOpen(false);
      onAccessChanged();
      if (staffIdForAccess) highlight(staffIdForAccess);
    } catch (err: any) {
      console.error('Edit access error:', err);
      toast.error(err.message || 'Failed to save access.');
    } finally {
      setSavingEditAccess(false);
    }
  };

  return (
    <>
      {/* ===== New access assignment modal ===== */}
      <Dialog open={accessModalOpen} onOpenChange={setAccessModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black">Assign Module Access</DialogTitle>
            <DialogDescription>
              Select the modules this staff member should be able to access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODULES.map(mod => (
                <label
                  key={mod}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                    accessPermissions[mod]
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  )}
                >
                  <span className="text-xs font-bold tracking-tight">
                    {MODULE_LABELS[mod] || mod}
                  </span>
                  <Checkbox
                    checked={accessPermissions[mod] || false}
                    onCheckedChange={checked => setAccessPermissions(prev => ({ ...prev, [mod]: !!checked }))}
                    className="h-4 w-4 border-slate-300"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setAccessModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAccess} disabled={savingAccess}>
              {savingAccess ? 'Saving...' : 'Save Access'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Edit access modal ===== */}
      <Dialog open={editAccessModalOpen} onOpenChange={setEditAccessModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black">
              {isNewAccess ? 'Assign Module Access' : 'Edit Module Access'}
            </DialogTitle>
            <DialogDescription>
              {isNewAccess
                ? 'This staff has no access record yet. Select the modules they should be able to access.'
                : 'Update the modules this staff member can access.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editAccessLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MODULES.map(mod => (
                  <label
                    key={mod}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                      editAccessPermissions[mod]
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                    )}
                  >
                    <span className="text-xs font-bold tracking-tight">
                      {MODULE_LABELS[mod] || mod}
                    </span>
                    <Checkbox
                      checked={editAccessPermissions[mod] || false}
                      onCheckedChange={checked =>
                        setEditAccessPermissions(prev => ({ ...prev, [mod]: !!checked }))
                      }
                      className="h-4 w-4 border-slate-300"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setEditAccessModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditAccess} disabled={savingEditAccess}>
              {savingEditAccess ? 'Saving...' : 'Save Access'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}