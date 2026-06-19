import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save, X } from "lucide-react";

/**
 * DataModal – Standardised form dialog.
 *
 * Props:
 *   open:         Whether the dialog is visible
 *   onOpenChange: Callback to toggle open state
 *   title:        Dialog heading
 *   description:  Optional description text (defaults to empty)
 *   onSubmit:     Callback when the form is submitted (must call e.preventDefault inside if needed)
 *   isLoading:    Disables submit button and shows spinner
 *   children:     Form fields / content
 */
export default function DataModal({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  isLoading,
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
        {/* ---- Header ---- */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="text-xl font-heading font-bold text-foreground">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ---- Form ---- */}
        <form
          onSubmit={onSubmit}
          className="px-6 py-5 space-y-5"
        >
          {children}

          {/* ---- Footer ---- */}
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}