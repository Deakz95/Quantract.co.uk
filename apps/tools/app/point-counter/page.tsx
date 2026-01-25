"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

// CRM base URL
const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "https://quantract.co.uk";

// Point type categories
type PointCategory = "domestic" | "commercial" | "custom";

interface PointTypeConfig {
  id: string;
  name: string;
  color: string;
  shortcut: string;
  category: PointCategory;
  isCustom?: boolean;
}

// Standard electrical point types with categories - using high-contrast colors
const DEFAULT_POINT_TYPES: PointTypeConfig[] = [
  // Domestic Points
  { id: "socket", name: "Socket Outlet", color: "#00D4FF", shortcut: "1", category: "domestic" },
  { id: "double-socket", name: "Double Socket", color: "#00A8CC", shortcut: "2", category: "domestic" },
  { id: "light", name: "Light Point", color: "#FFD700", shortcut: "3", category: "domestic" },
  { id: "switch", name: "Switch", color: "#00FF88", shortcut: "4", category: "domestic" },
  { id: "2-way-switch", name: "2-Way Switch", color: "#00CC6A", shortcut: "5", category: "domestic" },
  { id: "fcu", name: "FCU/Spur", color: "#FF00FF", shortcut: "6", category: "domestic" },
  { id: "cooker", name: "Cooker Point", color: "#FF3333", shortcut: "7", category: "domestic" },
  { id: "shower", name: "Shower Point", color: "#00FFFF", shortcut: "8", category: "domestic" },
  { id: "smoke-detector", name: "Smoke Detector", color: "#FF8800", shortcut: "9", category: "domestic" },
  { id: "data", name: "Data Point", color: "#AA66FF", shortcut: "0", category: "domestic" },

  // Commercial/Industrial Points
  { id: "3-phase", name: "3-Phase Supply", color: "#FF0066", shortcut: "", category: "commercial" },
  { id: "busbar", name: "Busbar/Trunking", color: "#CCFF00", shortcut: "", category: "commercial" },
  { id: "motor", name: "Motor Point", color: "#FF6600", shortcut: "", category: "commercial" },
  { id: "isolator", name: "Isolator", color: "#00FF00", shortcut: "", category: "commercial" },
  { id: "emergency-light", name: "Emergency Light", color: "#FFFF00", shortcut: "", category: "commercial" },
  { id: "fire-alarm", name: "Fire Alarm", color: "#FF0000", shortcut: "", category: "commercial" },
  { id: "access-control", name: "Access Control", color: "#0088FF", shortcut: "", category: "commercial" },
  { id: "cctv", name: "CCTV Point", color: "#8800FF", shortcut: "", category: "commercial" },
  { id: "ev-charger", name: "EV Charger", color: "#00FF44", shortcut: "", category: "commercial" },
  { id: "distribution-board", name: "Distribution Board", color: "#FF4488", shortcut: "", category: "commercial" },
];

interface Point {
  id: string;
  x: number;
  y: number;
  type: string;
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

// Preset colors for custom points
const CUSTOM_COLOR_PRESETS = [
  "#FF1493", // Deep Pink
  "#00CED1", // Dark Turquoise
  "#32CD32", // Lime Green
  "#FF4500", // Orange Red
  "#9400D3", // Dark Violet
  "#FFD700", // Gold
  "#00BFFF", // Deep Sky Blue
  "#FF69B4", // Hot Pink
  "#ADFF2F", // Green Yellow
  "#FF6347", // Tomato
  "#7B68EE", // Medium Slate Blue
  "#20B2AA", // Light Sea Green
];

export default function PointCounterPage() {
  const [pointTypes, setPointTypes] = useState<PointTypeConfig[]>(DEFAULT_POINT_TYPES);
  const [imageData, setImageData] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedType, setSelectedType] = useState<string>("socket");
  const [selectedCategory, setSelectedCategory] = useState<PointCategory>("domestic");
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

  // Custom point modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPointName, setCustomPointName] = useState("");
  const [customPointColor, setCustomPointColor] = useState(CUSTOM_COLOR_PRESETS[0]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Get point types for current category
  const currentCategoryTypes = pointTypes.filter((t) => t.category === selectedCategory);

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
      const pointConfig = pointTypes.find((p) => p.id === point.type);
      if (!pointConfig) return;

      const x = imgX + point.x;
      const y = imgY + point.y;
      const radius = 12 / scale;

      // Shadow for better visibility
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 6 / scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 / scale;

      // Outer circle with thick dark border for contrast
      ctx.beginPath();
      ctx.arc(x, y, radius + 2 / scale, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();

      // Main colored circle
      ctx.shadowColor = "transparent";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = pointConfig.color;
      ctx.fill();

      // White border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 / scale;
      ctx.stroke();

      // Inner bright dot
      ctx.beginPath();
      ctx.arc(x, y, radius / 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Get type index within all types for numbering
      const typeIndex = pointTypes.findIndex((t) => t.id === point.type);
      const label = (typeIndex + 1).toString();

      // Draw number label below point
      ctx.font = `bold ${10 / scale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // Label background
      const labelWidth = ctx.measureText(label).width + 6 / scale;
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(x - labelWidth / 2, y + radius + 4 / scale, labelWidth, 12 / scale);

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x, y + radius + 5 / scale);
    });

    ctx.restore();
  }, [imageData, points, scale, offset, pointTypes]);

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
      // Number keys for point type selection (domestic category only)
      const shortcut = e.key;
      const pointType = pointTypes.find((p) => p.shortcut === shortcut && p.category === "domestic");
      if (pointType) {
        setSelectedCategory("domestic");
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
  }, [history, historyIndex, pointTypes]);

  // Count points by type
  const pointCounts = pointTypes.map((type, index) => ({
    ...type,
    index: index + 1,
    count: points.filter((p) => p.type === type.id).length,
  }));

  // Export to CSV
  const exportCSV = () => {
    const rows = [
      ["#", "Point Type", "Category", "Count"],
      ...pointCounts.filter((p) => p.count > 0).map((p, i) => [(i + 1).toString(), p.name, p.category, p.count.toString()]),
      ["", "", "", ""],
      ["", "Total Points", "", points.length.toString()],
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

  // Add custom point type
  const addCustomPointType = () => {
    if (!customPointName.trim()) return;

    const newId = `custom-${Date.now()}`;
    const newType: PointTypeConfig = {
      id: newId,
      name: customPointName.trim(),
      color: customPointColor,
      shortcut: "",
      category: "custom",
      isCustom: true,
    };

    setPointTypes([...pointTypes, newType]);
    setSelectedCategory("custom");
    setSelectedType(newId);
    setShowCustomModal(false);
    setCustomPointName("");
    setCustomPointColor(CUSTOM_COLOR_PRESETS[0]);
  };

  // Delete custom point type
  const deleteCustomPointType = (typeId: string) => {
    setPointTypes(pointTypes.filter((t) => t.id !== typeId));
    // Remove points of this type
    setPoints(points.filter((p) => p.type !== typeId));
    // Reset selection if needed
    if (selectedType === typeId) {
      setSelectedType("socket");
      setSelectedCategory("domestic");
    }
  };

  // Create Quote - send to CRM
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteSending, setQuoteSending] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const createQuote = async () => {
    // Build query params with point counts
    const itemsWithCounts = pointCounts.filter((p) => p.count > 0);
    if (itemsWithCounts.length === 0) {
      setQuoteError("No points to send. Mark some points first.");
      return;
    }

    setQuoteSending(true);
    setQuoteError(null);

    // Encode items as URL params: type:count,type:count
    const itemsParam = itemsWithCounts.map((p) => `${encodeURIComponent(p.name)}:${p.count}`).join(",");
    const sourceParam = fileName ? encodeURIComponent(fileName) : "Point Counter";

    // Redirect to CRM quote page with pre-filled items
    const quoteUrl = `${CRM_URL}/admin/quotes/new?from=point-counter&items=${itemsParam}&source=${sourceParam}`;

    // Open in new tab
    window.open(quoteUrl, "_blank");
    setQuoteSending(false);
    setShowQuoteModal(false);
  };

  const getCategoryLabel = (cat: PointCategory) => {
    switch (cat) {
      case "domestic":
        return "Domestic";
      case "commercial":
        return "Commercial / Industrial";
      case "custom":
        return "Custom Points";
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
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Export CSV
              </button>
              <button
                onClick={() => setShowQuoteModal(true)}
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
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Create Quote
              </button>
            </>
          )}
        </div>
      </header>

      {/* Quote Modal */}
      {showQuoteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowQuoteModal(false)}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "420px",
              width: "90%",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>Create Quote in CRM</h2>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: "0 0 16px" }}>
              Send your point counts to Quantract CRM to create a quote. You'll be redirected to complete the quote details.
            </p>

            {/* Point summary */}
            <div
              style={{
                background: "var(--muted)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "8px" }}>
                Items to send
              </div>
              {pointCounts.filter((p) => p.count > 0).length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>No points marked</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {pointCounts.filter((p) => p.count > 0).map((type) => (
                    <div key={type.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: type.color,
                            border: "1px solid rgba(255,255,255,0.3)",
                          }}
                        />
                        {type.index}. {type.name}
                      </span>
                      <span style={{ fontWeight: 600 }}>×{type.count}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                    <span>Total Points</span>
                    <span>{points.length}</span>
                  </div>
                </div>
              )}
            </div>

            {quoteError && (
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--error)", borderRadius: "6px", padding: "8px 12px", marginBottom: "16px", fontSize: "13px", color: "var(--error)" }}>
                {quoteError}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowQuoteModal(false)}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={createQuote}
                disabled={quoteSending || pointCounts.filter((p) => p.count > 0).length === 0}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: pointCounts.filter((p) => p.count > 0).length === 0 ? "var(--muted)" : "var(--primary)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: pointCounts.filter((p) => p.count > 0).length === 0 ? "not-allowed" : "pointer",
                  opacity: quoteSending ? 0.7 : 1,
                }}
              >
                {quoteSending ? "Opening CRM..." : "Open in CRM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Point Modal */}
      {showCustomModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowCustomModal(false)}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "380px",
              width: "90%",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px" }}>Add Custom Point Type</h2>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                Point Name
              </label>
              <input
                type="text"
                value={customPointName}
                onChange={(e) => setCustomPointName(e.target.value)}
                placeholder="e.g., Underfloor Heating"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "var(--muted)",
                  color: "var(--foreground)",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "8px" }}>
                Select Color
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {CUSTOM_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCustomPointColor(color)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      background: color,
                      border: customPointColor === color ? "3px solid #fff" : "2px solid transparent",
                      cursor: "pointer",
                      boxShadow: customPointColor === color ? `0 0 0 2px ${color}` : "none",
                      transition: "all 0.15s",
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCustomModal(false)}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={addCustomPointType}
                disabled={!customPointName.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: !customPointName.trim() ? "var(--muted)" : "var(--primary)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: !customPointName.trim() ? "not-allowed" : "pointer",
                }}
              >
                Add Point Type
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "280px",
            borderRight: "1px solid var(--border)",
            background: "var(--card)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowY: "auto",
          }}
        >
          {/* Category Dropdown */}
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
              Category
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                const cat = e.target.value as PointCategory;
                setSelectedCategory(cat);
                // Select first point in category
                const firstType = pointTypes.find((t) => t.category === cat);
                if (firstType) setSelectedType(firstType.id);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "13px",
                fontWeight: 500,
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--muted)",
                color: "var(--foreground)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="domestic">Domestic</option>
              <option value="commercial">Commercial / Industrial</option>
              <option value="custom">Custom Points</option>
            </select>
          </div>

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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Point Types</span>
              {selectedCategory === "custom" && (
                <button
                  onClick={() => setShowCustomModal(true)}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--primary)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {currentCategoryTypes.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", padding: "8px", textAlign: "center" }}>
                  No custom points yet. Click "Add" to create one.
                </p>
              ) : (
                currentCategoryTypes.map((type) => {
                  const globalIndex = pointTypes.findIndex((t) => t.id === type.id) + 1;
                  return (
                    <div
                      key={type.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={() => setSelectedType(type.id)}
                        style={{
                          flex: 1,
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
                            minWidth: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: type.color,
                            flexShrink: 0,
                            boxShadow: selectedType === type.id ? `0 0 0 2px ${type.color}40` : "none",
                            border: "2px solid rgba(255,255,255,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#000",
                            textShadow: "0 0 2px rgba(255,255,255,0.5)",
                          }}
                        >
                          {globalIndex}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontSize: "13px",
                            fontWeight: selectedType === type.id ? 600 : 400,
                            color: selectedType === type.id ? "var(--primary)" : "var(--foreground)",
                          }}
                        >
                          {globalIndex}. {type.name}
                        </span>
                        {type.shortcut && (
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
                        )}
                      </button>
                      {type.isCustom && (
                        <button
                          onClick={() => deleteCustomPointType(type.id)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "4px",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            color: "var(--muted-foreground)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Delete custom point type"
                        >
                          <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
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
                maxHeight: "200px",
                overflowY: "auto",
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
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: type.color,
                              border: "1px solid rgba(255,255,255,0.3)",
                            }}
                          />
                          <span>{type.index}. {type.name}</span>
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
              <div>0-9 domestic types</div>
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
