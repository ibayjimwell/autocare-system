// components/skeleton/service-tracking-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ServiceTrackingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Filter bar skeleton */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Grid of appointment card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-full border rounded-xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              {/* Top row (tracking number + status) */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              {/* Date / Time */}
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              {/* Customer card skeleton */}
              <Skeleton className="h-14 w-full rounded-lg" />
              {/* Vehicle card skeleton */}
              <Skeleton className="h-14 w-full rounded-lg" />
              {/* Service card skeletons */}
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              {/* Action button */}
              <Skeleton className="h-12 w-full rounded-2xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}