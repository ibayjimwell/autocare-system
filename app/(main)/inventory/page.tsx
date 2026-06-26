'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  Package
} from "lucide-react";
import PageContainer from "@/components/shared/page-container";
import LoadingSpinner from "@/components/shared/loading-spinner";
import EmptyState from "@/components/shared/empty-state";
import ErrorHandler from "@/components/shared/error-handler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { inventoryApi } from "@/lib/inventory/inventory";
import InventoryForm from "@/components/inventory/inventory-form";
import {cn} from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [apiError, setApiError] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  // Modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingItemName, setDeletingItemName] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await inventoryApi.list({
        search: search || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      if (res.error) {
        setApiError({
          type: res.errorType || "fe",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Failed to load inventory.",
        });
        setItems([]);
      } else {
        setItems(res.data || []);
        setTotalPages(res.pagination?.pages || 1);
        setTotalItems(res.pagination?.total || 0);
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
  }, [search, page]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // reset to first page on new search
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormModalOpen(true);
  };

  const handleFormSuccess = () => {
    setFormModalOpen(false);
    loadItems();
  };

  const confirmDelete = (id: string, name: string) => {
    setDeletingItemId(id);
    setDeletingItemName(name);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItemId) return;
    try {
      const res = await inventoryApi.delete(deletingItemId);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to delete item.");
      } else {
        toast.success("Item deleted successfully.");
        setDeleteDialogOpen(false);
        loadItems();
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting item.");
    } finally {
      setDeletingItemId(null);
      setDeletingItemName("");
    }
  };

  // Toggle active status (we'll use PUT to update active flag)
  const toggleActive = async (item: any) => {
    try {
      const newActive = !item.active;
      const res = await inventoryApi.update(item.id, { active: newActive });
      if (res.error) {
        toast.error(res.errorMessage || "Failed to update status.");
      } else {
        toast.success(`Item ${newActive ? "activated" : "deactivated"}.`);
        loadItems();
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating status.");
    }
  };

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <PageContainer
      title="Inventory Management"
      subtitle="Manage parts, supplies, and consumables"
      actions={
        <Button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-6 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Item
        </Button>
      }
    >
      {/* API Error */}
      {apiError && (
        <div className="mb-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or description..."
            value={search}
            onChange={handleSearch}
            className="pl-10 rounded-xl border-slate-200 focus:ring-primary/20"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {totalItems} item{totalItems !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items"
          description="Add your first item to start managing your stock."
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.map((item) => (
              <Card
                key={item.id}
                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-foreground">{item.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.description || "No description"}
                      </p>
                    </div>
                    <Badge
                      variant={item.active ? "default" : "secondary"}
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      {item.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Qty:</span>{" "}
                      <span className="font-bold">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unit:</span>{" "}
                      <span className="font-bold">{item.unit}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>{" "}
                      <span className="font-bold text-primary">
                        ₱{Number(item.price).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reorder:</span>{" "}
                      <span className="font-bold">{item.reorderLevel}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(item)}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(item)}
                      className={cn(
                        "h-8 px-3 text-xs font-bold",
                        item.active
                          ? "text-orange-500 hover:text-orange-600"
                          : "text-green-500 hover:text-green-600"
                      )}
                    >
                      {item.active ? (
                        <PowerOff className="w-3.5 h-3.5 mr-1" />
                      ) : (
                        <Power className="w-3.5 h-3.5 mr-1" />
                      )}
                      {item.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(item.id, item.name)}
                      className="h-8 px-3 text-xs font-bold text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Name
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Description
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                    Quantity
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Unit
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                    Price
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                    Reorder
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="py-4 font-bold text-foreground">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.description || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.quantity}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right font-mono text-primary font-bold">
                      ₱{Number(item.price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.reorderLevel}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.active ? "default" : "secondary"}
                        className="text-[10px] font-bold uppercase tracking-wider"
                      >
                        {item.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(item)}
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(item)}
                          className={cn(
                            "h-8 w-8 rounded-lg",
                            item.active
                              ? "text-orange-400 hover:bg-orange-50"
                              : "text-green-500 hover:bg-green-50"
                          )}
                        >
                          {item.active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(item.id, item.name)}
                          className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="h-8 rounded-xl border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 7) {
                      if (i === 0) pageNum = 1;
                      else if (i === 1) pageNum = Math.max(2, page - 1);
                      else if (i === 2) pageNum = Math.max(3, page);
                      else if (i === 3) pageNum = Math.min(totalPages - 1, page + 1);
                      else if (i === 4) pageNum = totalPages;
                      else if (i === 5) pageNum = totalPages - 1;
                      else pageNum = totalPages - 2;
                      if (pageNum < 1) pageNum = 1;
                      if (pageNum > totalPages) pageNum = totalPages;
                    }
                    return (
                      <Button
                        key={i}
                        size="sm"
                        variant={page === pageNum ? "default" : "ghost"}
                        onClick={() => handlePageChange(pageNum)}
                        className={cn(
                          "w-8 h-8 rounded-xl text-[10px] font-black",
                          page === pageNum
                            ? "bg-primary text-white shadow-md"
                            : "text-slate-500"
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="h-8 rounded-xl border-slate-200"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <InventoryForm
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        item={editingItem}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingItemName}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="font-black"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}