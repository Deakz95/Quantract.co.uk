"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

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

// PDF.js library types
declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PDFDocument> };
      GlobalWorkerOptions: { workerSrc: string };
    };
  }
}

interface PDFDocument {
  numPages: number;
  getPage: (num: number) => Promise<PDFPage>;
}

interface PDFPage {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
}

export default function PointCounterPage() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedType, setSelectedType] = useState<PointType>("socket");
  const [history, setHistory] = useState<Point[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Load PDF.js library
  useEffect(() => {
    if (typeof window !== "undefined" && !window.pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
      };
      document.head.appendChild(script);
    }
  }, []);

  // Render PDF page to image
  const renderPDFPage = async (pdf: PDFDocument, pageNum: number) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 }); // Higher scale for better quality

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = tempCanvas.toDataURL("image/png");
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      imageDimensionsRef.current = { width: img.width, height: img.height };
      setImageData(dataUrl);
      setIsLoading(false);
    };
    img.src = dataUrl;
  };

  // Handle PDF file
  const handlePDFFile = async (file: File) => {
    if (!window.pdfjsLib) {
      alert("PDF library still loading. Please try again.");
      return;
    }

    setIsLoading(true);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    setPdfDoc(pdf);
    setTotalPages(pdf.numPages);
    setCurrentPage(1);
    setPoints([]);
    setHistory([]);
    setHistoryIndex(-1);
    setScale(1);
    setOffset({ x: 0, y: 0 });

    await renderPDFPage(pdf, 1);
  };

  // Change PDF page
  const changePage = async (newPage: number) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPages) return;
    setIsLoading(true);
    setCurrentPage(newPage);
    await renderPDFPage(pdfDoc, newPage);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (file.type === "application/pdf") {
      await handlePDFFile(file);
    } else if (file.type.startsWith("image/")) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          imageDimensionsRef.current = { width: img.width, height: img.height };
          setImageData(event.target?.result as string);
          setPoints([]);
          setHistory([]);
          setHistoryIndex(-1);
          setScale(1);
          setOffset({ x: 0, y: 0 });
          setPdfDoc(null);
          setTotalPages(1);
          setCurrentPage(1);
          setIsLoading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    setFileName(file.name);

    if (file.type === "application/pdf") {
      await handlePDFFile(file);
    } else if (file.type.startsWith("image/")) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          imageDimensionsRef.current = { width: img.width, height: img.height };
          setImageData(event.target?.result as string);
          setPoints([]);
          setHistory([]);
          setHistoryIndex(-1);
          setScale(1);
          setOffset({ x: 0, y: 0 });
          setPdfDoc(null);
          setTotalPages(1);
          setCurrentPage(1);
          setIsLoading(false);
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

    if (!canvas || !ctx || !img || !imageData) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = "#0f1115";
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
      const radius = 10 / scale;

      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 4 / scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 / scale;

      // Outer circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = pointConfig.color;
      ctx.fill();

      // Reset shadow for border
      ctx.shadowColor = "transparent";
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
  }, [imageData, points, scale, offset]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageData || !imageRef.current || isDragging) return;

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

  // Remove last point
  const undoLastPoint = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPoints(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setPoints([]);
      setHistoryIndex(-1);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            href="/"
            style={{
              color: "var(--muted-foreground)",
              display: "flex",
              alignItems: "center",
              transition: "color 0.2s",
            }}
          >
            <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Point Counter</h1>
            {fileName && (
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{fileName}</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {points.length > 0 && (
            <>
              <button
                onClick={undoLastPoint}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Undo
              </button>
              <button
                onClick={clearPoints}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Clear
              </button>
              <button
                onClick={exportCSV}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: "var(--primary)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Export CSV
              </button>
            </>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "260px",
            borderRight: "1px solid var(--border)",
            background: "var(--card)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowY: "auto",
          }}
        >
          {/* Point Type Selector */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted-foreground)",
                marginBottom: "8px",
              }}
            >
              Point Type
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {POINT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: selectedType === type.id ? "rgba(59, 130, 246, 0.15)" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: type.color,
                      flexShrink: 0,
                      boxShadow: selectedType === type.id ? `0 0 0 2px ${type.color}40` : "none",
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "13px",
                      fontWeight: selectedType === type.id ? 600 : 400,
                      color: selectedType === type.id ? "var(--primary)" : "var(--foreground)",
                    }}
                  >
                    {type.name}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--muted-foreground)",
                      fontFamily: "var(--font-mono)",
                      background: "var(--muted)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {type.shortcut}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Point Summary */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted-foreground)",
                marginBottom: "8px",
              }}
            >
              Summary
            </div>
            <div
              style={{
                background: "var(--muted)",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              {pointCounts.filter((p) => p.count > 0).length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>
                  No points marked yet
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {pointCounts
                    .filter((p) => p.count > 0)
                    .map((type) => (
                      <div
                        key={type.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "13px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: type.color,
                            }}
                          />
                          <span>{type.name}</span>
                        </div>
                        <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{type.count}</span>
                      </div>
                    ))}
                  <div
                    style={{
                      marginTop: "8px",
                      paddingTop: "8px",
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 600,
                      fontSize: "14px",
                    }}
                  >
                    <span>Total</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{points.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div style={{ marginTop: "auto" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted-foreground)",
                marginBottom: "8px",
              }}
            >
              Shortcuts
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--muted-foreground)",
                lineHeight: 1.6,
              }}
            >
              <div>Click to add point</div>
              <div>0-9 to switch type</div>
              <div>Scroll to zoom</div>
              <div>Shift+drag to pan</div>
              <div>Ctrl+Z undo, Ctrl+Y redo</div>
            </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            background: "#0f1115",
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {isLoading ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "3px solid var(--border)",
                  borderTopColor: "var(--primary)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Loading...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : !imageData ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "16px",
                  background: "var(--card)",
                  border: "2px dashed var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  transition: "all 0.2s",
                }}
              >
                <svg
                  style={{ width: 32, height: 32, color: "var(--muted-foreground)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                Drop a drawing here
              </p>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                or click to upload (PDF, PNG, JPG)
              </p>
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: "100%",
                  cursor: isDragging ? "grabbing" : "crosshair",
                }}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              />

              {/* Zoom & Page Controls */}
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  right: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--card)",
                  borderRadius: "8px",
                  padding: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={() => setScale((s) => Math.max(s * 0.8, 0.1))}
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--foreground)",
                  }}
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span style={{ fontSize: "12px", width: "48px", textAlign: "center", fontFamily: "var(--font-mono)" }}>
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(s * 1.2, 5))}
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--foreground)",
                  }}
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <div style={{ width: "1px", height: "20px", background: "var(--border)", margin: "0 4px" }} />
                <button
                  onClick={() => {
                    setScale(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--foreground)",
                  }}
                  title="Reset view"
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>

              {/* PDF Page Controls */}
              {pdfDoc && totalPages > 1 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "var(--card)",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <button
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    style={{
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      border: "none",
                      background: "transparent",
                      cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                      color: currentPage <= 1 ? "var(--muted-foreground)" : "var(--foreground)",
                      opacity: currentPage <= 1 ? 0.5 : 1,
                    }}
                  >
                    <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)" }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    style={{
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      border: "none",
                      background: "transparent",
                      cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                      color: currentPage >= totalPages ? "var(--muted-foreground)" : "var(--foreground)",
                      opacity: currentPage >= totalPages ? 0.5 : 1,
                    }}
                  >
                    <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </main>
  );
}
