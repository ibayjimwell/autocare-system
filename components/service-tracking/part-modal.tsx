'use client';

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";

export default function PartModal({
  open,
  onClose,
  onSave,
  amount,
  description,
  setAmount,
  setDescription,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 bg-primary/5">
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" /> Add Part / Material
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Amount (₱)</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-muted-foreground">₱</span>
              <Input type="number" step="0.01" className="pl-8 rounded-xl h-11" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
            <Input className="rounded-xl h-11" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Brake pads, oil filter" />
          </div>
        </div>
        <DialogFooter className="p-6 border-t flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={onSave} className="flex-1 rounded-xl">Add to Bill</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}