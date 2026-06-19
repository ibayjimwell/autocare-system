import { Loader2 } from "lucide-react";

/**
 * LoadingSpinner – Centered loading indicator.
 *
 * Props:
 *   size:     Tailwind size class (default "w-10 h-10")
 *   className: Additional container classes
 */
export default function LoadingSpinner({ size = "w-10 h-10", className }) {
  return (
    <div
      className={`flex items-center justify-center min-h-[300px] w-full ${className}`}
    >
      <Loader2
        className={`animate-spin text-primary ${size}`}
      />
    </div>
  );
}