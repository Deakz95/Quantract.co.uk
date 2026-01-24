import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Card>
          <CardHeader>
            <LoadingSkeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="space-y-2">
                    <LoadingSkeleton className="h-4 w-40" />
                    <LoadingSkeleton className="h-3 w-56" />
                  </div>
                  <LoadingSkeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4">
        <Card>
          <CardHeader>
            <LoadingSkeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
