"use client";

import { useState, useEffect } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MetalPriceData {
  copper: { price: number; unit: string; currency: string; change24h: number };
  aluminium: { price: number; unit: string; currency: string; change24h: number };
  source: string;
  timestamp: string;
  cached: boolean;
}

export default function MetalPricesPage() {
  const [data, setData] = useState<MetalPriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/metal-prices");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to fetch prices");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrices(); }, []);

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <ToolPage slug="metal-prices">
      <HowItWorks>
        <p>Live copper and aluminium prices in GBP/kg for estimating material costs.</p>
        <p>Prices update hourly. Use these as guide prices for quoting — always verify with your supplier.</p>
      </HowItWorks>

      <div className="mt-6 space-y-4">
        {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

        {data && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Copper", data: data.copper },
              { label: "Aluminium", data: data.aluminium },
            ].map(({ label, data: metal }) => (
              <Card key={label}>
                <CardHeader>
                  <CardTitle className="text-base">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    £{metal.price.toFixed(2)}<span className="text-sm font-normal text-[var(--muted-foreground)]">/{metal.unit}</span>
                  </div>
                  <div className={`text-sm mt-1 ${metal.change24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatChange(metal.change24h)} (24h)
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={fetchPrices} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
          {data && (
            <span className="text-xs text-[var(--muted-foreground)]">
              {data.source} — {new Date(data.timestamp).toLocaleString()} {data.cached && "(cached)"}
            </span>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
