import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/**
 * EmptyState – Displayed when there are no items to show.
 *
 * Props:
 *   icon:        Lucide icon component
 *   title:       Short heading (e.g., "No staff found")
 *   description: Optional explanatory text
 *   className:   Additional classes for the container
 */
export default function EmptyState({ icon: Icon, title, description, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 px-4 text-center",
        className
      )}
    >
      <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-primary/60" />
      </div>
      <h3 className="text-lg font-heading font-bold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
    </div>
  );
}