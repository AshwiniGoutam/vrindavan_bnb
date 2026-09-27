export default function Loading() {
  return (
    <div className="container-x pb-24 pt-36" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-32 animate-pulse bg-linen" />
      <div className="mt-8 h-14 w-3/4 max-w-2xl animate-pulse bg-linen" />
      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="photo-fallback aspect-[4/5] animate-pulse" />
            <div className="mt-5 h-6 w-2/3 animate-pulse bg-linen" />
          </div>
        ))}
      </div>
    </div>
  );
}
