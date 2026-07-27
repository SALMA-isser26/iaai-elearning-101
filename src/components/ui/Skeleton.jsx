/**
 * Skeleton — placeholder animé pendant le chargement des données
 *
 * Usage :
 *   <Skeleton className="h-4 w-48" />
 *   <Skeleton circle className="w-10 h-10" />
 *   <SkeletonCard />
 *   <SkeletonCourseCard />
 */


const Skeleton = ({ className = '', circle = false }) => (
  <div
    className={[
      'animate-pulse bg-gray-100 dark:bg-gray-800',
      circle ? 'rounded-full' : 'rounded-md',
      className,
    ].join(' ')}
    aria-hidden="true"
  />
);

export const SkeletonText = ({ lines = 3, lastLineWidth = '60%' }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className="h-3.5"
        style={{ width: i === lines - 1 ? lastLineWidth : '100%' }}
      />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton circle className="w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

export const SkeletonCourseCard = () => (
  <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
    <Skeleton className="w-full h-36 rounded-none" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton circle className="w-6 h-6" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  </div>
);

export default Skeleton;
