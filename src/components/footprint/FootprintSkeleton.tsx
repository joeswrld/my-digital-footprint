import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const FootprintSkeleton = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Exposure Score Skeleton */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Circle */}
            <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
              <Skeleton className="h-40 w-40 rounded-full" />
            </div>
            <div className="flex justify-center">
              <Skeleton className="h-7 w-32 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-3 gap-2 border-t pt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-8 w-12 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto mt-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats Skeletons */}
      <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-12 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breach Monitor Skeleton */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-5 w-40 mt-4" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Graph Skeleton */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-[140px]" />
              <Skeleton className="h-10 w-[130px]" />
            </div>
            {/* Legend */}
            <Skeleton className="h-12 w-full rounded-lg" />
            {/* Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8" />
                      <div>
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-3 w-32 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-5" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="mt-3 flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
