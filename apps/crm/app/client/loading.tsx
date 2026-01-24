import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function ClientLoading() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <LoadingSkeleton className="h-4 w-64" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            <LoadingSkeleton className="h-4 w-40" />
            <LoadingSkeleton className="h-3 w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}
