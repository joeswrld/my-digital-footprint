import { Skeleton } from '@/components/ui/skeleton';

interface ChartSkeletonProps {
  type: 'area' | 'bar' | 'pie' | 'horizontal-bar';
  height?: string;
}

export function ChartSkeleton({ type, height = 'h-[250px]' }: ChartSkeletonProps) {
  if (type === 'area') {
    return (
      <div className={`${height} w-full flex flex-col justify-end p-4`}>
        <div className="flex items-end gap-1 h-[85%]">
          {[40, 55, 45, 70, 60, 80, 75, 90, 65, 55, 70, 85, 60, 75, 80].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-sm"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-3 w-10" />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div className={`${height} w-full flex items-center justify-center`}>
        <div className="relative">
          <Skeleton className="h-[160px] w-[160px] rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-[80px] w-[80px] rounded-full bg-background" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'horizontal-bar') {
    return (
      <div className={`${height} w-full flex flex-col justify-center gap-6 p-4`}>
        {[85, 60, 35].map((w, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 rounded" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }

  // Default vertical bar chart
  return (
    <div className={`${height} w-full flex flex-col justify-end p-4`}>
      <div className="flex items-end justify-center gap-8 h-[85%]">
        {[70, 45].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-20 rounded-t" style={{ height: `${h}%` }} />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
