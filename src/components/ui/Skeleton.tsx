/** Lataustilat ovat skeletoneja, ei spinnereitä keskellä ruutua (SPEC §7). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />
}

export function ScreenSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  )
}
