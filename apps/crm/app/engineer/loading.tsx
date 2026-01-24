import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function EngineerLoading() {
  return (
    <div className="space-y-4">
      <LoadingSkeleton className="h-6 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="space-y-2">
              <LoadingSkeleton className="h-4 w-44" />
              <LoadingSkeleton className="h-3 w-64" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
