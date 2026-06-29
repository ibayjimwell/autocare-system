'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Settings,
  PlayCircle,
  Trash2,
  FileText,
  Package,
  Pencil,
} from "lucide-react";
import ConfirmationDialog from "@/components/shared/confimation-dialog";

interface TaskCardProps {
  task: any;
  onUpdate: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: () => void;
  appointmentId: string;
  isInProgress: boolean;
}

export default function TaskCard({
  task,
  onUpdate,
  onDelete,
  onEdit,
  appointmentId,
  isInProgress,
}: TaskCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [markDoneConfirmOpen, setMarkDoneConfirmOpen] = useState(false);

  const isActive = task.status === "IN_PROGRESS";
  const isDone = task.status === "DONE";

  const statusConfig = {
    PENDING: {
      border: "border-l-muted-foreground/30",
      bg: "bg-card",
      icon: null,
      label: "To Do",
    },
    IN_PROGRESS: {
      border: "border-l-red-500",
      bg: "bg-red-50/30",
      icon: <Settings className="w-4 h-4 animate-spin text-red-500" />,
      label: "Active",
    },
    DONE: {
      border: "border-l-green-500",
      bg: "bg-green-50/30",
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      label: "Completed",
    },
  };

  const currentStatus = statusConfig[task.status] || statusConfig.PENDING;

  return (
    <>
      <Card
        className={`group relative overflow-hidden transition-all duration-300 hover:shadow-md border border-border border-l-4 ${currentStatus.border} ${currentStatus.bg} rounded-xl`}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center gap-2">
                {currentStatus.icon}
                <h4
                  className={`font-bold text-sm sm:text-base tracking-tight ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
                >
                  {task.title}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase h-5 px-1.5">
                  {currentStatus.label}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!isDone && (
                <div className="flex gap-2">
                  {task.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStartDialogOpen(true)}
                      className="h-9 px-4 rounded-full border-primary/20 hover:bg-primary hover:text-white"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" /> Start
                    </Button>
                  )}
                  {task.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      onClick={() => setMarkDoneConfirmOpen(true)}
                      className="h-9 px-4 rounded-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Finish
                    </Button>
                  )}
                </div>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={onEdit}
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDeleteDialogOpen(true)}
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Findings */}
          {task.findings && task.findings.length > 0 && (
            <div className="mt-4 space-y-3">
              <Separator className="bg-border/50" />
              <div className="space-y-3">
                {task.findings.map((f: any, idx: number) => (
                  <div key={idx} className="bg-background/60 border rounded-lg p-3 space-y-2 shadow-sm">
                    <div className="flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 mt-0.5 text-primary/70" />
                      <div className="flex-1">
                        <p className="text-[11px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">
                          Finding Details
                        </p>
                        <p className="text-sm">{f.description}</p>
                      </div>
                    </div>
                    {f.products?.length > 0 && (
                      <div className="pl-5 pt-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                          <Package className="w-3 h-3" /> Materials Used
                        </div>
                        <div className="grid gap-1">
                          {f.products.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs bg-muted/30 px-2 py-1.5 rounded-md">
                              <span className="flex items-center gap-2">
                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  {p.quantity}x
                                </span>
                                <span className="font-medium">{p.name}</span>
                              </span>
                              <span className="font-mono">₱{Number(p.priceAtTime).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ConfirmationDialog
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
        title="Start Operation"
        description={`Begin working on "${task.title}"?`}
        onConfirm={() => {
          onUpdate(task.id, "IN_PROGRESS");
          setStartDialogOpen(false);
        }}
        confirmText="Confirm Start"
      />
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Task"
        description={`Delete "${task.title}"? This cannot be undone.`}
        onConfirm={() => {
          onDelete(task.id);
          setDeleteDialogOpen(false);
        }}
        confirmText="Delete Task"
        variant="destructive"
      />
      <ConfirmationDialog
        open={markDoneConfirmOpen}
        onOpenChange={setMarkDoneConfirmOpen}
        title="Complete Task"
        description={`Mark "${task.title}" as completed?`}
        onConfirm={() => {
          onUpdate(task.id, "DONE");
          setMarkDoneConfirmOpen(false);
        }}
        confirmText="Mark as Completed"
      />
    </>
  );
}