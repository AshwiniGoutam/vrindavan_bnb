export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-8 border-b hairline pb-6">
        <div className="h-3 w-24 animate-pulse bg-linen" />
        <div className="mt-4 h-10 w-72 max-w-full animate-pulse bg-linen" />
      </div>
      <div className="grid grid-cols-2 gap-px border hairline bg-charcoal/10 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-paper p-5">
            <div className="h-2.5 w-20 animate-pulse bg-linen" />
            <div className="mt-4 h-7 w-24 animate-pulse bg-linen" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-px border hairline bg-charcoal/10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-6 bg-paper p-4">
            <div className="h-4 w-1/4 animate-pulse bg-linen" />
            <div className="h-4 w-1/3 animate-pulse bg-linen" />
            <div className="ml-auto h-4 w-16 animate-pulse bg-linen" />
          </div>
        ))}
      </div>
    </div>
  );
}
