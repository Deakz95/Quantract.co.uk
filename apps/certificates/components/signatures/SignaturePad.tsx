"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@quantract/ui";

interface SignaturePadProps {
  /** Called with PNG data URL when user clicks Save */
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  /** Optional initial data URL to display */
  initialValue?: string | null;
}

/**
 * Multi-stroke signature pad.
 *
 * Key fix over old SignatureCapture:
 * - Multiple strokes allowed (pointer up does NOT finalise)
 * - Signature ends only when user clicks Save
 * - Supports touch, mouse, and stylus via pointer events
 * - Clear button resets canvas
 * - Preview before save
 */
export function SignaturePad({ onSave, onCancel, initialValue }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Initialise canvas
  const initCanvas = useCallback(() => {
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
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#000";
      ctxRef.current = ctx;
    }
  }, []);

  useEffect(() => {
    initCanvas();

    // Load initial value if present
    if (initialValue && canvasRef.current && ctxRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasStrokes(true);
      };
      img.src = initialValue;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      // Save current content, resize, restore
      const canvas = canvasRef.current;
      if (!canvas) return;
      const imageData = canvas.toDataURL("image/png");
      initCanvas();
      if (hasStrokes) {
        const img = new Image();
        img.onload = () => {
          const rect = canvas.getBoundingClientRect();
          ctxRef.current?.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = imageData;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initCanvas, hasStrokes]);

  const getPoint = (e: React.PointerEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }
    isDrawing.current = true;
    lastPoint.current = getPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    const pt = getPoint(e);
    if (!ctx || !pt || !lastPoint.current) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPoint.current = pt;
    if (!hasStrokes) setHasStrokes(true);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // End the current stroke — but do NOT finalise the signature
    isDrawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr);
    setHasStrokes(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-[var(--border)] rounded-xl bg-white relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ touchAction: "none", height: "160px" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
            <svg className="w-6 h-6 text-[var(--muted-foreground)]/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
            </svg>
            <span className="text-sm text-[var(--muted-foreground)]/60">
              Sign here — multiple strokes supported
            </span>
          </div>
        )}
        {/* Signature line */}
        <div className="absolute bottom-6 left-8 right-8 border-b border-[var(--muted-foreground)]/20 pointer-events-none" />
      </div>

      <div className="flex items-center gap-2 justify-end">
        {hasStrokes && (
          <Button variant="secondary" size="sm" onClick={clearCanvas}>
            Clear
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!hasStrokes}>
          Save Signature
        </Button>
      </div>
    </div>
  );
}
