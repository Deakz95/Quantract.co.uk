
'use client';

import { useParams } from 'next/navigation';
import AdminJobDetail from './AdminJobDetailClient';

export default function JobPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  return <AdminJobDetail jobId={jobId} />;
}
