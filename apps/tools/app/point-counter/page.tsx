"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardContent, NativeSelect, Label } from "@quantract/ui";

// Standard electrical point types
const POINT_TYPES = [
  { id: "socket", name: "Socket Outlet", color: "#3b82f6", shortcut: "1" },
  { id: "double-socket", name: "Double Socket", color: "#2563eb", shortcut: "2" },
  { id: "light", name: "Light Point", color: "#f59e0b", shortcut: "3" },
  { id: "switch", name: "Switch", color: "#10b981", shortcut: "4" },
  { id: "2-way-switch", name: "2-Way Switch", color: "#059669", shortcut: "5" },
  { id: "fcu", name: "FCU/Spur", color: "#8b5cf6", shortcut: "6" },
  { id: "cooker", name: "Cooker Point", color: "#ef4444", shortcut: "7" },
  { id: "shower", name: "Shower Point", color: "#06b6d4", shortcut: "8" },
  { id: "smoke-detector", name: "Smoke Detector", color: "#f97316", shortcut: "9" },
  { id: "data", name: "Data Point", color: "#6366f1", shortcut: "0" },
] as const;

type PointType = (typeof POINT_TYPES)[number]["id"];

interface Point {
  id: string;
  x: number;
  y: number;
  type: PointType;
}

export default function PointCounterPage() {
  const [image, setImage] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedType, setSelectedType] = useState<PointType>("socket");
  const [history, setHistory] = useState<Point[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setImage(event.target?.result as string);
          setPoints([]);
          setHistory([]);
          setHistoryIndex(-1);
          setScale(1);
          setOffset({ x: 0, y: 0 });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setImage(event.target?.result as string);
          setPoints([]);
          setHistory([]);
          setHistoryIndex(-1);
          setScale(1);
          setOffset({ x: 0, y: 0 });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;

    if (!canvas || !ctx || !img || !image) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Center image
    const imgX = (canvas.width / scale - img.width) / 2 - offset.x / scale;
    const imgY = (canvas.height / scale - img.height) / 2 - offset.y / scale;
    ctx.drawImage(img, imgX, imgY);

    // Draw points
    points.forEach((point) => {
      const pointConfig = POINT_TYPES.find((p) => p.id === point.type);
      if (!pointConfig) return;

      const x = imgX + point.x;
      const y = imgY + point.y;
      const radius = 12 / scale;

      // Outer circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = pointConfig.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 / scale;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(x, y, radius / 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });

    ctx.restore();
  }, [image, points, scale, offset]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image || !imageRef.current || isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to image coordinates
    const img = imageRef.current;
    const imgX = (canvas.width / scale - img.width) / 2 - offset.x / scale;
    const imgY = (canvas.height / scale - img.height) / 2 - offset.y / scale;

    const x = (clickX - offset.x) / scale - imgX;
    const y = (clickY - offset.y) / scale - imgY;

    // Check if click is within image bounds
    if (x < 0 || x > img.width || y < 0 || y > img.height) return;

    const newPoint: Point = {
      id: crypto.randomUUID(),
      x,
      y,
      type: selectedType,
    };

    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPoints);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Handle mouse events for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.1), 5));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Number keys for point type selection
      const shortcut = e.key;
      const pointType = POINT_TYPES.find((p) => p.shortcut === shortcut);
      if (pointType) {
        setSelectedType(pointType.id);
        return;
      }

      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
          setPoints(history[historyIndex - 1]);
        } else if (historyIndex === 0) {
          setPoints([]);
          setHistoryIndex(-1);
        }
      }

      // Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          setHistoryIndex(historyIndex + 1);
          setPoints(history[historyIndex + 1]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, historyIndex]);

  // Count points by type
  const pointCounts = POINT_TYPES.map((type) => ({
    ...type,
    count: points.filter((p) => p.type === type.id).length,
  }));

  // Export to CSV
  const exportCSV = () => {
    const rows = [
      ["Point Type", "Count"],
      ...pointCounts.filter((p) => p.count > 0).map((p) => [p.name, p.count.toString()]),
      ["", ""],
      ["Total Points", points.length.toString()],
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "point-count.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear all points
  const clearPoints = () => {
    setPoints([]);
    setHistory([]);
    setHistoryIndex(-1);
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold">Point Counter</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={clearPoints} disabled={points.length === 0}>
              Clear All
            </Button>
            <Button size="sm" onClick={exportCSV} disabled={points.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-72 border-r border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Point Type Selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Point Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {POINT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      selectedType === type.id
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "hover:bg-[var(--muted)]"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="flex-1">{type.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{type.shortcut}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Point Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Point Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pointCounts
                  .filter((p) => p.count > 0)
                  .map((type) => (
                    <div key={type.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <span>{type.name}</span>
                      </div>
                      <span className="font-semibold">{type.count}</span>
                    </div>
                  ))}
                {points.length === 0 && (
                  <p className="text-sm text-[var(--muted-foreground)]">No points marked yet</p>
                )}
              </div>
              {points.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{points.length}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-[var(--muted-foreground)] space-y-1">
                <li>• Click on the drawing to add points</li>
                <li>• Use number keys 0-9 to switch type</li>
                <li>• Scroll to zoom in/out</li>
                <li>• Shift+drag to pan</li>
                <li>• Ctrl+Z to undo, Ctrl+Y to redo</li>
              </ul>
            </CardContent>
          </Card>
        </aside>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-[#1a1a2e]"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {!image ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 rounded-2xl bg-[var(--card)] border-2 border-dashed border-[var(--border)] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-semibold mb-2">Drop a drawing here</p>
              <p className="text-sm text-[var(--muted-foreground)]">or click to upload (PDF, PNG, JPG)</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
          )}

          {/* Zoom controls */}
          {image && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-[var(--card)] rounded-lg p-2 border border-[var(--border)]">
              <button
                onClick={() => setScale((s) => Math.max(s * 0.8, 0.1))}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--muted)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale((s) => Math.min(s * 1.2, 5))}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--muted)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--muted)] ml-2"
                title="Reset view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </main>
  );
}
