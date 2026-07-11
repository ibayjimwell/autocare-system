import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, RotateCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryCardProps {
  item: any;
  onEdit: () => void;
  onRestock: () => void;
}

export default function InventoryCard({ item, onEdit, onRestock }: InventoryCardProps) {
  const isLow = item.quantity <= item.reorderLevel;
  return (
    <Card className={cn("relative overflow-hidden rounded-2xl border shadow-sm hover:shadow-md transition-all", isLow && "border-red-300 bg-red-50/30")}>
      <CardContent className="p-5 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description || "—"}</p>
          </div>
          <Badge variant={item.active ? "default" : "secondary"} className="text-[10px]">
            {item.active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Qty:</span> <strong>{item.quantity}</strong></div>
          <div><span className="text-muted-foreground">Unit:</span> <strong>{item.unit}</strong></div>
          <div>
            <span className="text-muted-foreground">Cost:</span>{" "}
            <strong className="text-primary">₱{parseFloat(item.costPrice).toFixed(2)}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Sell:</span>{" "}
            <strong className="text-green-600">₱{parseFloat(item.sellingPrice).toFixed(2)}</strong>
          </div>
        </div>

        {isLow && (
          <div className="flex items-center gap-1 text-xs font-bold text-red-600">
            <AlertTriangle className="w-3 h-3" /> Low stock (reorder at {item.reorderLevel})
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onRestock} className="h-8 px-2 text-xs">
            <RotateCw className="w-3 h-3 mr-1" /> Restock
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2 text-xs">
            <Pencil className="w-3 h-3 mr-1" /> Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}