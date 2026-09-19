// Shimmer wale placeholder blocks - "Loading..." text se zyada smooth lagte hain
export function Skeleton({ className = "" }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 2 ? "w-4/5" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="mt-4 h-4 w-2/3" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <CardSkeleton lines={5} />
    </div>
  );
}
