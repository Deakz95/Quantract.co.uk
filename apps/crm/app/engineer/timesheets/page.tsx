import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimesheetsClient } from "./timesheetsClient";

export default function EngineerTimesheetsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Timesheets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Log your time against jobs and submit your weekly timesheet for approval. Approved entries are locked.
          </p>
        </CardContent>
      </Card>

      <TimesheetsClient />
    </div>
  );
}
