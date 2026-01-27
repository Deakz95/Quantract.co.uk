// src/components/sign/SignaturePad.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
};

export default function SignaturePad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);

  const hasInk = useMemo(() => !!value, [value]);

  function getPos(e: PointerEvent, canvas: HTMLCanvasElement) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function redrawFromValue() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = value;
  }

  function snapshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    last.current = null;
    onChange(null);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.25;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";

    const onPointerDown = (e: PointerEvent) => {
      drawing.current = true;
      last.current = getPos(e, canvas);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawing.current) return;
      const p = getPos(e, canvas);
      const l = last.current;
      if (!l) {
        last.current = p;
        return;
      }
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
    };

    const onPointerUp = () => {
      if (!drawing.current) return;
      drawing.current = false;
      last.current = null;
      snapshot();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    setReady(true);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    redrawFromValue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, value]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-[var(--foreground)]">Draw your signature</div>
        <Button variant="ghost" type="button" onClick={clear} disabled={!hasInk}>
          Clear
        </Button>
      </div>
      <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none rounded-xl focus-visible:outline-none"
          aria-label="Signature pad - Draw your signature here"
          tabIndex={0}
          role="img"
        />
      </div>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">Use your finger, mouse or stylus.</p>
    </div>
  );
}
