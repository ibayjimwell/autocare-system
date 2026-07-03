// components/skeleton/task-card-skeleton.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TaskCardSkeleton() {
  return (
    <Card className="border border-border rounded-xl">
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}