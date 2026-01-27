
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/Breadcrumbs';

export default function JobOverview({params}:{params:{jobId:string}}){
  const [data,setData]=useState<any>(null);

  useEffect(()=>{
    fetch(`/api/admin/jobs/${params.jobId}/finance-overview`)
      .then(r=>r.json())
      .then(j=>setData(j.data));
  },[params.jobId]);

  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    const jobLabel = data?.job?.name ? `Job: ${data.job.name}` : `Job #${params.jobId.slice(0, 8)}`;
    return [
      { label: "Dashboard", href: "/admin" },
      { label: "Jobs", href: "/admin/jobs" },
      { label: jobLabel },
    ];
  }, [params.jobId, data?.job?.name]);

  if(!data) return <p>Loading job overview…</p>;

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />
      <h1>{data.job.name}</h1>
      <h2>Financial Overview</h2>
      <ul>
        <li>Contract Value: £{((data.revenue.contractValue||0)/100).toFixed(2)}</li>
        <li>Invoiced: £{((data.revenue.invoicedToDate||0)/100).toFixed(2)}</li>
        <li>Budget Total: £{((data.costs.budgetTotal||0)/100).toFixed(2)}</li>
        <li>Actual Cost: £{((data.costs.actualCost||0)/100).toFixed(2)}</li>
        <li>Forecast Margin: £{((data.forecast.forecastMargin||0)/100).toFixed(2)}</li>
      </ul>
    </div>
  );
}
