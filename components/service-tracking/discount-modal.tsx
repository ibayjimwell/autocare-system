'use client';

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Percent } from "lucide-react";

export default function DiscountModal({
  open,
  onClose,
  onSave,
  type,
  value,
  description,
  setType,
  setValue,
  setDescription,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 bg-primary/5">
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" /> Add Discount
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Discount Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">
              {type === "fixed" ? "Amount (₱)" : "Percentage (%)"}
            </Label>
            <Input type="number" step={type === "percentage" ? "1" : "0.01"} className="rounded-xl h-11" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "fixed" ? "0.00" : "0"} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Description (optional)</Label>
            <Input className="rounded-xl h-11" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Senior discount" />
          </div>
        </div>
        <DialogFooter className="p-6 border-t flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={onSave} className="flex-1 rounded-xl">Apply Discount</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}