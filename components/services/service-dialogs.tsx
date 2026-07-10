'use client';

import React from 'react';
import ConfirmationDialog from '@/components/services/confirmation-dialog';

interface ServiceDialogsProps {
  deactivateDialog: { open: boolean; id: string | null; name: string };
  enableDialog: { open: boolean; id: string | null; name: string };
  onDeactivate: () => void;
  onEnable: () => void;
  setDeactivateDialog: (data: any) => void;
  setEnableDialog: (data: any) => void;
}

export default function ServiceDialogs({
  deactivateDialog, enableDialog, onDeactivate, onEnable,
  setDeactivateDialog, setEnableDialog,
}: ServiceDialogsProps) {
  return (
    <>
      <ConfirmationDialog
        open={deactivateDialog.open}
        onOpenChange={(open) => setDeactivateDialog({ ...deactivateDialog, open })}
        title="Confirm Deactivation"
        description={`This will hide "${deactivateDialog.name}" from the customer booking portal. You can reactivate it later.`}
        onConfirm={onDeactivate}
        confirmText="Deactivate Service"
      />
      <ConfirmationDialog
        open={enableDialog.open}
        onOpenChange={(open) => setEnableDialog({ ...enableDialog, open })}
        title="Enable Service"
        description={`Reactivate "${enableDialog.name}"? It will become available again in the customer booking portal.`}
        onConfirm={onEnable}
        confirmText="Enable Service"
      />
    </>
  );
}