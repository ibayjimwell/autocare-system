import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-label="Loading dashboard">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full max-w-2xl" />
          <Skeleton className="h-5 w-full max-w-3xl" />
          <Skeleton className="h-5 w-2/3 max-w-2xl" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5"
          >
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-4 h-9 w-24" />
            <Skeleton className="mt-3 h-3 w-36" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-2 h-4 w-72 max-w-full" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 4 }).map((__, row) => (
                <Skeleton key={row} className="h-8 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
