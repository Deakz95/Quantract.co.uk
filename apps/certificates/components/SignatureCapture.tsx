"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@quantract/ui";

interface SignatureCaptureProps {
  label: string;
  /** PNG data URL, e.g. "data:image/png;base64,..." */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

/**
 * Touch-friendly canvas signature pad for tablet field use.
 * Produces a trimmed PNG data URL (max ~150 KB).
 */
export function SignatureCapture({ label, value, onChange }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Reset canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onChange(null);
  }, [onChange]);

  // Resize canvas to match display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#000";
    }
  }, []);

  const getPoint = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setDrawing(true);
    lastPoint.current = getPoint(e);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pt = getPoint(e);
    if (!ctx || !pt || !lastPoint.current) return;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPoint.current = pt;
    setHasStrokes(true);
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    lastPoint.current = null;
    // Export to data URL
    const canvas = canvasRef.current;
    if (canvas && hasStrokes) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  if (value) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--foreground)]">{label}</label>
        <div className="border border-[var(--border)] rounded-lg p-3 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} signature`}
            className="max-h-[100px] mx-auto"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={clearCanvas}>
          Clear Signature
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--foreground)]">{label}</label>
      <div className="border-2 border-dashed border-[var(--border)] rounded-lg bg-white relative">
        <canvas
          ref={canvasRef}
          className="w-full h-[120px] cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-[var(--muted-foreground)]">
              Sign here
            </span>
          </div>
        )}
      </div>
      {hasStrokes && (
        <Button variant="secondary" size="sm" onClick={clearCanvas}>
          Clear
        </Button>
      )}
    </div>
  );
}
