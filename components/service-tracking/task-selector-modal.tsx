import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * TaskSelectorModal – Simple modal to pick an active task.
 * Backend: no API needed, purely UI.
 */
export default function TaskSelectorModal({
  open,
  onOpenChange,
  tasks,
  onSelectTask,
  title,
}) {
  const activeTasks = tasks.filter((t) => t.status === "IN_PROGRESS");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-60">
          <div className="space-y-2 p-1">
            {activeTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active tasks available.
              </p>
            ) : (
              activeTasks.map((task) => (
                <Button
                  key={task.id}
                  variant="outline"
                  className="w-full justify-start text-left font-medium h-auto py-3 px-4 rounded-xl"
                  onClick={() => onSelectTask(task.id)}
                >
                  {task.title}
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}