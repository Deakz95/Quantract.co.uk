
'use client';

import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from 'react';

export default function SuppliersPage(){
  const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{
    fetch('/api/admin/suppliers')
      .then(r=>r.json())
      .then(j=>setItems(j.data||[]));
  },[]);
  return (
    <AppShell role="admin" title="Suppliers" subtitle="Manage supplier records.">
      <div>
      <h1>Suppliers</h1>
      <table style={{width:'100%'}}>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th></tr>
        </thead>
        <tbody>
          {items.map(s=>(
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.email||'-'}</td>
              <td>{s.phone||'-'}</td>
              <td>{s.isActive ? 'Active':'Inactive'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </AppShell>
  );
}
