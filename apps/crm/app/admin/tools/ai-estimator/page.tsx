"use client";

import { useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";

interface LineItem {
  description: string;
  qty: number;
  unit: string;
  labourHours: number;
  materialCost: number;
  labourCost: number;
}

interface Estimate {
  summary: string;
  lineItems: LineItem[];
  totalMaterialCost: number;
  totalLabourCost: number;
  totalCost: number;
  totalHours: number;
  confidence: string;
  assumptions: string[];
  caveats: string[];
}

export default function AiEstimatorPage() {
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!description.trim() && !imageBase64) return;
    setLoading(true);
    setEstimate(null);
    setRawText(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/ai/estimate-from-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || undefined,
          imageBase64: imageBase64 || undefined,
        }),
      });
      const d = await res.json();
      if (!d.ok) {
        setError(d.error || "Failed");
        return;
      }
      if (d.data.parsed) {
        setEstimate(d.data.estimate);
      } else {
        setRawText(d.data.raw);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const CONFIDENCE_STYLES: Record<string, string> = {
    high: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-red-100 text-red-800",
  };

  return (
    <AppShell role="admin" title="AI Job Estimator">
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-2">AI Job Estimator</h1>
      <p className="text-sm text-gray-500 mb-6">
        Describe a job or upload a photo to get a rough cost and time estimate. Estimates are AI-generated and should be verified.
      </p>

      <div className="space-y-4 mb-6">
        <textarea
          placeholder="Describe the job... e.g. 'Full rewire of 3-bed semi, consumer unit upgrade, 12 double sockets, 8 lighting points'"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full border rounded-lg px-4 py-3 text-sm"
        />

        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-gray-100 text-sm rounded hover:bg-gray-200"
          >
            {imagePreview ? "Change Photo" : "Upload Photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          {imagePreview && (
            <button onClick={() => { setImagePreview(null); setImageBase64(null); }} className="text-xs text-red-500">
              Remove
            </button>
          )}
        </div>

        {imagePreview && (
          <img src={imagePreview} alt="Preview" className="max-h-48 rounded border" />
        )}

        <button
          onClick={submit}
          disabled={loading || (!description.trim() && !imageBase64)}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? "Estimating..." : "Get Estimate"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {rawText && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h2 className="font-semibold mb-2">AI Response</h2>
          <pre className="text-sm whitespace-pre-wrap">{rawText}</pre>
        </div>
      )}

      {estimate && (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Estimate</h2>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${CONFIDENCE_STYLES[estimate.confidence] || "bg-gray-100"}`}>
                {estimate.confidence} confidence
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-4">{estimate.summary}</p>

            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Labour</th>
                  <th className="py-1 text-right">Materials</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {estimate.lineItems.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1">{item.description}</td>
                    <td className="py-1 text-right">{item.qty} {item.unit}</td>
                    <td className="py-1 text-right">{"\u00A3"}{item.labourCost}</td>
                    <td className="py-1 text-right">{"\u00A3"}{item.materialCost}</td>
                    <td className="py-1 text-right font-medium">{"\u00A3"}{item.labourCost + item.materialCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-3 gap-4 text-center border-t pt-3">
              <div>
                <div className="text-lg font-bold">{"\u00A3"}{estimate.totalCost}</div>
                <div className="text-xs text-gray-500">Total Cost</div>
              </div>
              <div>
                <div className="text-lg font-bold">{estimate.totalHours}h</div>
                <div className="text-xs text-gray-500">Total Hours</div>
              </div>
              <div>
                <div className="text-lg font-bold">{"\u00A3"}{estimate.totalMaterialCost}</div>
                <div className="text-xs text-gray-500">Materials</div>
              </div>
            </div>
          </div>

          {estimate.assumptions.length > 0 && (
            <div className="border rounded-lg p-4 bg-yellow-50">
              <h3 className="text-sm font-semibold mb-1">Assumptions</h3>
              <ul className="text-xs text-gray-600 list-disc pl-4">
                {estimate.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {estimate.caveats.length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50">
              <h3 className="text-sm font-semibold mb-1">Caveats</h3>
              <ul className="text-xs text-gray-600 list-disc pl-4">
                {estimate.caveats.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
    </AppShell>
  );
}
