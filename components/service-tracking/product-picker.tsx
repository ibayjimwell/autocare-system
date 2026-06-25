'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PackagePlus,
  Search,
  X,
  Plus,
  Minus,
  Package,
  ChevronDown,
  ChevronUp,
  Loader2,
  Tag,
} from "lucide-react";

/**
 * ProductPicker – Flat UI to search inventory and link parts to a task.
 * Backend: stock deduction via inventoryApi.
 */
export default function ProductPicker({
  taskId,
  taskTitle,
  appointmentId,
  usedProducts = [],
  onDeduct,
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState({});
  const [loading, setLoading] = useState(false);

  // TODO: Backend – load inventory items when opened
  // useEffect(() => { if (open) { ... fetch items } }, [open]);

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const getQty = (id) => qty[id] ?? 1;

  const handleDeduct = (item) => {
    // TODO: Backend – deduct stock and notify
    onDeduct({
      inventoryItemId: item.id,
      name: item.name,
      qty: getQty(item.id),
      unit: item.unit,
      sellPrice: item.sellPrice,
    });
  };

  return (
    <div className="w-full transition-all duration-300">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 text-xs font-bold uppercase ${
          open ? "text-destructive hover:bg-destructive/10" : "text-primary hover:bg-primary/10"
        }`}
      >
        {open ? <X className="w-4 h-4" /> : <PackagePlus className="w-4 h-4" />}
        {open ? "Cancel Picker" : "Link Parts & Materials"}
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </Button>

      {open && (
        <div className="mt-3 border border-border rounded-2xl bg-card shadow-xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
          <div className="p-3 bg-muted/30 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search inventory (Name, SKU, or Type)..."
                className="pl-10 h-10 rounded-xl"
              />
            </div>
          </div>

          <ScrollArea className="h-72">
            <div className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                  <Package className="w-8 h-8 mb-2" />
                  <p className="text-xs font-medium">No inventory items found</p>
                </div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-bold">{item.name}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {item.sku}</span>
                        <span className="text-primary font-bold">₱{Number(item.sellPrice).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setQty((q) => ({ ...q, [item.id]: Math.max(1, getQty(item.id) - 1) }))}
                          className="w-8 h-8 rounded-full"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-black w-8 text-center">{getQty(item.id)}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setQty((q) => ({ ...q, [item.id]: Math.min(item.stockQty, getQty(item.id) + 1) }))}
                          className="w-8 h-8 rounded-full"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        disabled={item.stockQty === 0 || loading}
                        onClick={() => handleDeduct(item)}
                        className="h-9 px-5 rounded-full font-bold uppercase text-[10px]"
                      >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Use Item"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {usedProducts.length > 0 && (
            <div className="p-3 bg-primary/5 border-t border-primary/10">
              <p className="text-[10px] font-black text-primary/70 uppercase mb-2 px-1">Linked in Current Batch</p>
              <div className="flex flex-wrap gap-2">
                {usedProducts.map((p, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="pl-2 pr-3 py-1 text-[10px] font-bold gap-1.5 border border-primary/10 bg-background shadow-sm rounded-lg"
                  >
                    <span className="text-primary">{p.qty}×</span> {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}