// components/skeleton/appointments-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AppointmentsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left side: Calendar + Booking Form */}
      <div className="lg:col-span-8 space-y-6">
        {/* Calendar skeleton */}
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-0">
            <Skeleton className="h-[400px] w-full rounded-none" />
          </CardHeader>
        </Card>

        {/* Booking Form skeleton */}
        <Card className="border-none shadow-lg rounded-3xl">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <div className="md:col-span-2">
                <Skeleton className="h-12 rounded-xl" />
              </div>
              <div className="md:col-span-2">
                <Skeleton className="h-[80px] rounded-xl" />
              </div>
              <div className="md:col-span-2">
                <Skeleton className="h-12 rounded-xl" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-10 w-20 rounded-xl" />
                  <Skeleton className="h-10 w-20 rounded-xl" />
                  <Skeleton className="h-10 w-20 rounded-xl" />
                </div>
              </div>
            </div>
            <Skeleton className="h-14 rounded-2xl w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Right side: Agenda */}
      <div className="lg:col-span-4">
        <Card className="flex flex-col h-[calc(100vh-12rem)] shadow-xl border-none rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 pb-6">
            <Skeleton className="h-6 w-32 bg-slate-700" />
            <Skeleton className="h-10 w-full mt-4 bg-slate-700" />
          </CardHeader>
          <CardContent className="flex-1 space-y-4 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}