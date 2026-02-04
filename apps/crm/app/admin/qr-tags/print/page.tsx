'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";

type QrTag = {
  id: string;
  code: string;
  label: string | null;
  status: string;
};

type TagWithImage = QrTag & { dataUrl: string };

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "assigned", label: "Assigned" },
  { value: "all", label: "All" },
];

export default function QrTagsPrintPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "available";
  const [tags, setTags] = useState<TagWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", "100");

    fetch(`/api/admin/qr-tags?${params}`)
      .then((r) => r.json())
      .then(async (j) => {
        const rawTags: QrTag[] = j.tags || [];
        const origin = window.location.origin;
        const withImages = await Promise.all(
          rawTags.map(async (tag) => {
            const url = `${origin}/q/${tag.code}`;
            const dataUrl = await QRCode.toDataURL(url, {
              width: 200,
              margin: 1,
              errorCorrectionLevel: "M",
            });
            return { ...tag, dataUrl };
          })
        );
        setTags(withImages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        Loading QR tags...
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <h2>No {statusFilter === "all" ? "" : statusFilter} tags to print</h2>
        <p>Generate some QR tags first, then come back to print them.</p>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 8 }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              style={{
                padding: "8px 16px",
                border: statusFilter === opt.value ? "2px solid #0f172a" : "1px solid #e2e8f0",
                borderRadius: 8,
                background: statusFilter === opt.value ? "#0f172a" : "#fff",
                color: statusFilter === opt.value ? "#fff" : "#0f172a",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: statusFilter === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 10mm; }
        }
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 20px;
          max-width: 210mm;
          margin: 0 auto;
        }
        .qr-cell {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px;
          text-align: center;
          break-inside: avoid;
        }
        .qr-cell img {
          width: 100%;
          max-width: 140px;
          height: auto;
        }
        .qr-label {
          font-size: 11px;
          font-weight: 600;
          color: #0f172a;
          margin-top: 4px;
          word-break: break-all;
        }
        .qr-code-snippet {
          font-size: 9px;
          font-family: monospace;
          color: #64748b;
          margin-top: 2px;
        }
      `}</style>

      <div className="no-print" style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12, fontFamily: "system-ui, sans-serif" }}>
        <button
          onClick={() => window.history.back()}
          style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14 }}
        >
          Back
        </button>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            style={{
              padding: "8px 16px",
              border: statusFilter === opt.value ? "2px solid #0f172a" : "1px solid #e2e8f0",
              borderRadius: 8,
              background: statusFilter === opt.value ? "#0f172a" : "#fff",
              color: statusFilter === opt.value ? "#fff" : "#0f172a",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: statusFilter === opt.value ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => window.print()}
          style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, marginLeft: "auto" }}
        >
          Print ({tags.length} tags)
        </button>
      </div>

      <div className="qr-grid">
        {tags.map((tag) => (
          <div key={tag.id} className="qr-cell">
            <img src={tag.dataUrl} alt={`QR ${tag.label || tag.code}`} />
            {tag.label && <div className="qr-label">{tag.label}</div>}
            <div className="qr-code-snippet">{tag.code.slice(0, 8)}...{tag.code.slice(-4)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
