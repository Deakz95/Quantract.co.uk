
'use client';

import { use } from 'react';
import AdminJobDetail from './AdminJobDetailClient';

export default function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  return <AdminJobDetail jobId={jobId} />;
}
