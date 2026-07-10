'use client';

import React, { useState, useEffect } from 'react';
import DataModal from '@/components/shared/data-modal';
import { Checkbox } from '@/components/ui/checkbox';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { MODULES, MODULE_LABELS } from '@/app-utils/staffs/constants';
import { accessApi } from '@/lib/staffs/access';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AccessModalsProps {
  accessModalOpen: boolean;
  setAccessModalOpen: (open: boolean) => void;
  editAccessModalOpen: boolean;
  setEditAccessModalOpen: (open: boolean) => void;
  staffIdForAccess: string | null;           // for both assign and edit (context)
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

  // Reset permissions when modals open
  useEffect(() => {
    if (accessModalOpen) {
      const initial: Record<string, boolean> = {};
      MODULES.forEach(mod => { initial[mod] = false; });
      setAccessPermissions(initial);
    }
  }, [accessModalOpen]);

  // Load existing access for edit modal
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

  const handleSaveAccess = async () => {
    if (!staffIdForAccess) return;
    setSavingAccess(true);
    try {
      const res = await accessApi.create(staffIdForAccess, accessPermissions);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to assign access.');
      } else {
        toast.success('Access permissions assigned.');
        setAccessModalOpen(false);
        onAccessChanged();
        highlight(staffIdForAccess);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign access.');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleSaveEditAccess = async () => {
    if (!staffIdForAccess) return;
    setSavingEditAccess(true);
    try {
      let res;
      if (isNewAccess) {
        res = await accessApi.create(staffIdForAccess, editAccessPermissions);
      } else {
        res = await accessApi.update(staffIdForAccess, editAccessPermissions);
      }
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to save access permissions.');
      } else {
        toast.success('Access permissions saved successfully.');
        setEditAccessModalOpen(false);
        onAccessChanged();
        highlight(staffIdForAccess);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save access.');
    } finally {
      setSavingEditAccess(false);
    }
  };

  return (
    <>
      {/* New access assignment modal */}
      <DataModal
        open={accessModalOpen}
        onOpenChange={setAccessModalOpen}
        title="Assign Module Access"
        description="Select the modules this staff member should be able to access."
        onSubmit={handleSaveAccess}
        isLoading={savingAccess}
      >
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
      </DataModal>

      {/* Edit access modal */}
      <DataModal
        open={editAccessModalOpen}
        onOpenChange={setEditAccessModalOpen}
        title={isNewAccess ? 'Assign Module Access' : 'Edit Module Access'}
        description={isNewAccess
          ? 'This staff has no access record yet. Select the modules they should be able to access.'
          : 'Update the modules this staff member can access.'}
        onSubmit={handleSaveEditAccess}
        isLoading={savingEditAccess}
      >
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
      </DataModal>
    </>
  );
}