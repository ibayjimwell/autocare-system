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

import {
  MODULES,
  MODULE_LABELS,
} from '@/app-utils/staffs/constants';

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
  const [accessPermissions, setAccessPermissions] =
    useState<Record<string, boolean>>({});

  const [savingAccess, setSavingAccess] =
    useState(false);

  const [
    editAccessPermissions,
    setEditAccessPermissions,
  ] = useState<Record<string, boolean>>({});

  const [editAccessLoading, setEditAccessLoading] =
    useState(false);

  const [savingEditAccess, setSavingEditAccess] =
    useState(false);

  const [isNewAccess, setIsNewAccess] =
    useState(false);

  useEffect(() => {
    if (accessModalOpen) {
      const initial: Record<
        string,
        boolean
      > = {};

      MODULES.forEach((mod) => {
        initial[mod] = false;
      });

      setAccessPermissions(initial);
    }
  }, [accessModalOpen]);

  useEffect(() => {
    if (
      editAccessModalOpen &&
      staffIdForAccess
    ) {
      (async () => {
        setEditAccessLoading(true);

        try {
          const res = await accessApi.get(
            staffIdForAccess
          );

          if (
            res.error ||
            !res.data
          ) {
            setIsNewAccess(true);

            const initial: Record<
              string,
              boolean
            > = {};

            MODULES.forEach((mod) => {
              initial[mod] = false;
            });

            setEditAccessPermissions(
              initial
            );
          } else {
            setIsNewAccess(false);

            const perms: Record<
              string,
              boolean
            > = {};

            MODULES.forEach((mod) => {
              perms[mod] =
                res.data[mod] === true;
            });

            setEditAccessPermissions(
              perms
            );
          }
        } catch (err) {
          console.error(err);
          toast.error(
            'Failed to load access permissions.'
          );
        } finally {
          setEditAccessLoading(false);
        }
      })();
    }
  }, [
    editAccessModalOpen,
    staffIdForAccess,
  ]);

  const handleSaveAccess = async () => {
    if (!staffIdForAccess) {
      toast.error('No staff selected.');
      return;
    }

    const payload = Object.fromEntries(
      Object.entries(
        accessPermissions
      ).map(([k, v]) => [
        k,
        v === true,
      ])
    );

    console.log(
      'Saving access for staff:',
      staffIdForAccess,
      payload
    );

    setSavingAccess(true);

    try {
      await accessApi.create(
        staffIdForAccess,
        payload
      );

      toast.success(
        'Access permissions assigned.'
      );

      setAccessModalOpen(false);
      onAccessChanged();

      if (staffIdForAccess) {
        highlight(staffIdForAccess);
      }
    } catch (err: any) {
      console.error(
        'Create access error:',
        err
      );

      toast.error(
        err.message ||
          'Failed to assign access.'
      );
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
      Object.entries(
        editAccessPermissions
      ).map(([k, v]) => [
        k,
        v === true,
      ])
    );

    console.log(
      'Saving edited access for staff:',
      staffIdForAccess,
      payload
    );

    setSavingEditAccess(true);

    try {
      let res;

      if (isNewAccess) {
        res = await accessApi.create(
          staffIdForAccess,
          payload
        );
      } else {
        res = await accessApi.update(
          staffIdForAccess,
          payload
        );
      }

      toast.success(
        'Access permissions saved successfully.'
      );

      setEditAccessModalOpen(false);
      onAccessChanged();

      if (staffIdForAccess) {
        highlight(staffIdForAccess);
      }
    } catch (err: any) {
      console.error(
        'Edit access error:',
        err
      );

      toast.error(
        err.message ||
          'Failed to save access.'
      );
    } finally {
      setSavingEditAccess(false);
    }
  };

  const moduleGrid = (
    permissions: Record<string, boolean>,
    setPermissions: React.Dispatch<
      React.SetStateAction<
        Record<string, boolean>
      >
    >
  ) => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {MODULES.map((mod) => {
        const checked =
          permissions[mod] || false;

        return (
          <label
            key={mod}
            className={cn(
              `
              flex min-h-12
              cursor-pointer select-none
              items-center justify-between
              gap-3 rounded-md border
              px-3 py-2.5
              transition-colors
              `,
              checked
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/30'
            )}
          >
            <span className="text-xs font-medium">
              {MODULE_LABELS[mod] || mod}
            </span>

            <Checkbox
              checked={checked}
              onCheckedChange={(value) =>
                setPermissions(
                  (prev) => ({
                    ...prev,
                    [mod]: !!value,
                  })
                )
              }
              className="
                h-5 w-5
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            />
          </label>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ============================================================
          NEW ACCESS ASSIGNMENT
          ============================================================ */}
      <Dialog
        open={accessModalOpen}
        onOpenChange={setAccessModalOpen}
      >
        <DialogContent
          className="
            rounded-xl
            p-5
            shadow-xl
            sm:max-w-lg
            md:p-6
          "
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Assign Module Access
            </DialogTitle>

            <DialogDescription className="text-sm leading-relaxed">
              Select the modules this staff
              member should be able to access.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            {moduleGrid(
              accessPermissions,
              setAccessPermissions
            )}
          </div>

          <div
            className="
              mt-5 flex flex-col-reverse
              gap-2 sm:flex-row sm:justify-end
            "
          >
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setAccessModalOpen(false)
              }
              className="
                h-11 rounded-md
                px-4 font-medium
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9
              "
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSaveAccess}
              disabled={savingAccess}
              className="
                h-11 rounded-md
                px-4 font-medium
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9
              "
            >
              {savingAccess
                ? 'Saving...'
                : 'Save Access'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          EDIT ACCESS
          ============================================================ */}
      <Dialog
        open={editAccessModalOpen}
        onOpenChange={
          setEditAccessModalOpen
        }
      >
        <DialogContent
          className="
            rounded-xl
            p-5
            shadow-xl
            sm:max-w-lg
            md:p-6
          "
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {isNewAccess
                ? 'Assign Module Access'
                : 'Edit Module Access'}
            </DialogTitle>

            <DialogDescription className="text-sm leading-relaxed">
              {isNewAccess
                ? 'This staff has no access record yet. Select the modules they should be able to access.'
                : 'Update the modules this staff member can access.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            {editAccessLoading ? (
              <LoadingSpinner />
            ) : (
              moduleGrid(
                editAccessPermissions,
                setEditAccessPermissions
              )
            )}
          </div>

          <div
            className="
              mt-5 flex flex-col-reverse
              gap-2 sm:flex-row sm:justify-end
            "
          >
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setEditAccessModalOpen(
                  false
                )
              }
              className="
                h-11 rounded-md
                px-4 font-medium
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9
              "
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={
                handleSaveEditAccess
              }
              disabled={
                savingEditAccess ||
                editAccessLoading
              }
              className="
                h-11 rounded-md
                px-4 font-medium
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9
              "
            >
              {savingEditAccess
                ? 'Saving...'
                : 'Save Access'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}