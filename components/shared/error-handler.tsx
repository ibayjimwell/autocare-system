'use client';

import React, { useState } from "react";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react"; // import X icon

export default function ErrorHandler({ type, title, message }: { type: string; title: string; message: string }) {
  const [open, setOpen] = useState(true);
  const [showAlert, setShowAlert] = useState(true);

  // Normalize type to lowercase to avoid casing issues
  const normalizedType = type?.toLowerCase();

  // ------------------------------
  // Render “fve” inline alert
  // ------------------------------
  if (normalizedType === "fve") {
    if (!showAlert) return null;
    return (
      <Alert variant="destructive" className="max-w-md mx-auto my-4 relative">
        <AlertDescription>{message}</AlertDescription>
        <button
          onClick={() => setShowAlert(false)}
          className="absolute right-2 top-2 text-destructive-foreground/70 hover:text-destructive-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </Alert>
    );
  } else {
    // ------------------------------
    // Render modal for all other types
    // ------------------------------
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button onClick={() => setOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}