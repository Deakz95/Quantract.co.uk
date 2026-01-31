"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

interface TruckStockItem {
  id: string;
  qty: number;
  minQty: number;
  stockItem: { id: string; name: string; sku: string | null; unit: string };
  user: { id: string; name: string | null; email: string };
}

export default function TruckStockPage() {
  const [items, setItems] = useState<TruckStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowOnly, setLowOnly] = useState(false);

  function load() {
    const params = lowOnly ? "?lowStock=true" : "";
    fetch(`/api/admin/truck-stock${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setItems(d.data); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [lowOnly]);

  async function adjust(stockItemId: string, userId: string, delta: number) {
    await fetch("/api/admin/truck-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockItemId, userId, qtyDelta: delta }),
    });
    load();
  }

  return (
    <AppShell role="admin" title="Truck / Van Stock">
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Truck / Van Stock</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">{lowOnly ? "No low-stock items." : "No truck stock records yet."}</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Engineer</th>
              <th className="py-2">Item</th>
              <th className="py-2">SKU</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Min</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={`border-b ${item.qty <= item.minQty ? "bg-red-50" : ""}`}>
                <td className="py-2">{item.user.name || item.user.email}</td>
                <td className="py-2 font-medium">{item.stockItem.name}</td>
                <td className="py-2 text-gray-400">{item.stockItem.sku || "-"}</td>
                <td className="py-2 text-right">
                  {item.qty} {item.stockItem.unit}
                </td>
                <td className="py-2 text-right text-gray-400">{item.minQty}</td>
                <td className="py-2 text-right">
                  <button onClick={() => adjust(item.stockItem.id, item.user.id, -1)} className="px-2 py-0.5 text-xs bg-gray-100 rounded hover:bg-gray-200 mr-1">-1</button>
                  <button onClick={() => adjust(item.stockItem.id, item.user.id, 1)} className="px-2 py-0.5 text-xs bg-gray-100 rounded hover:bg-gray-200">+1</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    </AppShell>
  );
}
