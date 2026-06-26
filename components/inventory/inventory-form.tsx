'use client';

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Save, X } from "lucide-react";
import { inventoryApi } from "@/lib/inventory/inventory";
import ErrorHandler from "@/components/shared/error-handler";

interface InventoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null; // null for create
  onSuccess: () => void;
}

export default function InventoryForm({
  open,
  onOpenChange,
  item,
  onSuccess,
}: InventoryFormProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    quantity: 0,
    unit: "",
    price: 0,
    reorderLevel: 0,
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || "",
        description: item.description || "",
        quantity: item.quantity || 0,
        unit: item.unit || "",
        price: parseFloat(item.price) || 0,
        reorderLevel: item.reorderLevel || 0,
        active: item.active !== undefined ? item.active : true,
      });
    } else {
      setForm({
        name: "",
        description: "",
        quantity: 0,
        unit: "",
        price: 0,
        reorderLevel: 0,
        active: true,
      });
    }
    setApiError(null);
  }, [item, open]);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);

    // Basic validation
    if (!form.name.trim()) {
      setApiError({
        type: "fve",
        title: "Validation Error",
        message: "Name is required.",
      });
      setLoading(false);
      return;
    }
    if (!form.unit.trim()) {
      setApiError({
        type: "fve",
        title: "Validation Error",
        message: "Unit is required.",
      });
      setLoading(false);
      return;
    }
    if (form.quantity < 0) {
      setApiError({
        type: "fve",
        title: "Validation Error",
        message: "Quantity must be a non-negative number.",
      });
      setLoading(false);
      return;
    }
    if (form.price < 0) {
      setApiError({
        type: "fve",
        title: "Validation Error",
        message: "Price must be a non-negative number.",
      });
      setLoading(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      quantity: Number(form.quantity),
      unit: form.unit.trim(),
      price: form.price,
      reorderLevel: Number(form.reorderLevel),
      active: form.active,
    };

    try {
      let res;
      if (item) {
        res = await inventoryApi.update(item.id, payload);
      } else {
        res = await inventoryApi.create(payload);
      }
      if (res.error) {
        setApiError({
          type: res.errorType || "fve",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Operation failed.",
        });
      } else {
        toast.success(item ? "Item updated." : "Item created.");
        onSuccess();
      }
    } catch (err: any) {
      setApiError({
        type: "se",
        title: "Unexpected Error",
        message: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b bg-muted/10">
          <DialogTitle className="text-xl font-black">
            {item ? "Edit Item" : "Add New Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {apiError && (
            <ErrorHandler
              type={apiError.type}
              title={apiError.title}
              message={apiError.message}
            />
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Name *
            </Label>
            <Input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Engine Oil 5W-30"
              className="rounded-xl border-slate-200"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <Input
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Optional description"
              className="rounded-xl border-slate-200"
            />
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Quantity *
              </Label>
              <Input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) =>
                  handleChange("quantity", parseInt(e.target.value) || 0)
                }
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Unit *
              </Label>
              <Input
                value={form.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
                placeholder="e.g., piece, liter, kg"
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>

          {/* Price & Reorder Level */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Price (₱)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) =>
                  handleChange("price", parseFloat(e.target.value) || 0)
                }
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Reorder Level
              </Label>
              <Input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) =>
                  handleChange("reorderLevel", parseInt(e.target.value) || 0)
                }
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.active}
              onCheckedChange={(checked) =>
                handleChange("active", !!checked)
              }
              id="active"
            />
            <Label htmlFor="active" className="text-sm font-bold">
              Active (available for use)
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="font-bold"
            >
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {item ? "Update Item" : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}