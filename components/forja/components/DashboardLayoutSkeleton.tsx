import { Skeleton } from './ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-sanfran-offwhite dark:bg-slate-950">
      <div className="relative w-[280px] space-y-6 border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-md bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="space-y-2 px-2">
          <Skeleton className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-slate-700" />
              <Skeleton className="h-2 w-32 bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4">
        <Skeleton className="h-12 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <Skeleton className="h-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}
