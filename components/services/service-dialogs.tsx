'use client';

import React from 'react';

import ConfirmationDialog from '@/components/services/confirmation-dialog';

interface ServiceDialogsProps {
  deleteDialog: { open: boolean; id: string | null; name: string };
  setDeleteDialog: (data: any) => void;
  onDelete: () => void;
  deactivateDialog: {
    open: boolean;
    id: string | null;
    name: string;
  };

  enableDialog: {
    open: boolean;
    id: string | null;
    name: string;
  };

  onDeactivate: () => void;
  onEnable: () => void;

  setDeactivateDialog: (
    data: any
  ) => void;

  setEnableDialog: (
    data: any
  ) => void;
}

export default function ServiceDialogs({
  deactivateDialog,
  enableDialog,
  deleteDialog,
  setDeleteDialog,
  onDelete,
  onDeactivate,
  onEnable,
  setDeactivateDialog,
  setEnableDialog,
}: ServiceDialogsProps) {
  return (
    <>
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Permanently Delete Service?"
        description={`You are responsible for this action. Permanently deleting "${deleteDialog.name}" cannot be undone. Services attached to appointments cannot be deleted; disable those instead.`}
        onConfirm={onDelete}
        confirmText="Permanently Delete"
        variant="destructive"
      />
      <ConfirmationDialog
        open={
          deactivateDialog.open
        }
        onOpenChange={(open) =>
          setDeactivateDialog({
            ...deactivateDialog,
            open,
          })
        }
        title="Confirm Deactivation"
        description={`This will hide "${deactivateDialog.name}" from the customer booking portal. You can reactivate it later.`}
        onConfirm={onDeactivate}
        confirmText="Deactivate Service"
        variant="destructive"
      />

      <ConfirmationDialog
        open={
          enableDialog.open
        }
        onOpenChange={(open) =>
          setEnableDialog({
            ...enableDialog,
            open,
          })
        }
        title="Enable Service"
        description={`Reactivate "${enableDialog.name}"? It will become available again in the customer booking portal.`}
        onConfirm={onEnable}
        confirmText="Enable Service"
        variant="default"
      />
    </>
  );
}