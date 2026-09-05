import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Highlighter,
  Eraser,
  MousePointer,
  Sparkles,
  Type,
  Minus,
  MoveRight,
  Square,
  Circle as CircleIcon,
  StickyNote,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Grid3X3,
  Plus,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hash,
  Triangle,
} from "lucide-react";

export type WhiteboardTool =
  | "pen"
  | "highlighter"
  | "eraser"
  | "select"
  | "laser"
  | "text"
  | "line"
  | "arrow"
  | "rectangle"
  | "circle"
  | "triangle"
  | "sticky"
  | "numberline";

export interface DrawingElement {
  id: string;
  type: WhiteboardTool;
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  backgroundColor?: string;
  authorRole?: "teacher" | "student";
  authorName?: string;
}

export interface WhiteboardPageItem {
  pageIndex: number;
  title: string;
  elementsJson: string;
}

interface ClassroomWhiteboardProps {
  sessionId: string;
  isTeacher: boolean;
  canDraw: boolean;
  pages: WhiteboardPageItem[];
  currentPageIndex: number;
  onSavePage: (pageIndex: number, title: string, elementsJson: string) => void;
  onCreatePage: (title: string) => void;
  onClearPage: (pageIndex: number) => void;
  onSwitchPage: (pageIndex: number) => void;
  onBroadcastOp?: (op: any) => void;
  remoteOps?: any[];
  authorRole?: "teacher" | "student";
  authorName?: string;
  onClearStudentAnnotations?: () => void;
}

const COLORS = [
  "#0F172A", // Slate/Black
  "#0D9488", // Teal
  "#2563EB", // Blue
  "#DC2626", // Red
  "#16A34A", // Green
  "#9333EA", // Purple
  "#EA580C", // Orange
  "#CA8A04", // Gold/Yellow
];

const STROKE_WIDTHS = [2, 4, 8, 14];

export function ClassroomWhiteboard({
  sessionId,
  isTeacher,
  canDraw,
  pages,
  currentPageIndex,
  onSavePage,
  onCreatePage,
  onClearPage,
  onSwitchPage,
  onBroadcastOp,
  remoteOps,
  authorRole = "teacher",
  authorName = "User",
  onClearStudentAnnotations,
}: ClassroomWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<WhiteboardTool>("pen");
  const [selectedColor, setSelectedColor] = useState<string>("#0D9488");
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [gridMode, setGridMode] = useState<"blank" | "grid" | "coordinate">("grid");
  const [scale, setScale] = useState<number>(1);

  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [history, setHistory] = useState<DrawingElement[][]>([]);
  const [historyStep, setHistoryStep] = useState<number>(0);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [laserPoint, setLaserPoint] = useState<{ x: number; y: number } | null>(null);

  // Real-time remote collaborative state
  const [remoteLaserPoint, setRemoteLaserPoint] = useState<{
    x: number;
    y: number;
    authorName: string;
    authorRole: string;
  } | null>(null);
  const [remoteCurrentElement, setRemoteCurrentElement] = useState<DrawingElement | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Text input overlay state
  const [textInputState, setTextInputState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
  }>({ visible: false, x: 0, y: 0, text: "" });

  // Load elements when page changes
  const activePage = pages.find((p) => p.pageIndex === currentPageIndex) || pages[0];

  useEffect(() => {
    if (activePage?.elementsJson) {
      try {
        const parsed = JSON.parse(activePage.elementsJson);
        if (Array.isArray(parsed)) {
          setElements(parsed);
          setHistory([parsed]);
          setHistoryStep(0);
        }
      } catch (e) {
        console.error("Failed to parse page elements:", e);
      }
    } else {
      setElements([]);
      setHistory([[]]);
      setHistoryStep(0);
    }
  }, [currentPageIndex, activePage?.elementsJson]);

  // Real-time synchronization of remote drawing ops
  useEffect(() => {
    if (!remoteOps || remoteOps.length === 0) return;
    const latest = remoteOps[remoteOps.length - 1];
    if (!latest) return;

    if (latest.type === "laser") {
      setRemoteLaserPoint({
        x: latest.x,
        y: latest.y,
        authorName: latest.authorName || "Peer",
        authorRole: latest.authorRole || "student",
      });
    } else if (latest.type === "laser-clear") {
      setRemoteLaserPoint(null);
    } else if (latest.type === "draw-progress") {
      setRemoteCurrentElement(latest.element);
    } else if (latest.type === "draw-commit") {
      setRemoteCurrentElement(null);
      if (latest.element) {
        setElements((prev) => {
          if (prev.some((el) => el.id === latest.element.id)) return prev;
          return [...prev, latest.element];
        });
      }
    } else if (latest.type === "clear-student-annotations") {
      setElements((prev) => prev.filter((el) => el.authorRole !== "student"));
    } else if (latest.type === "clear-page") {
      setElements([]);
    }
  }, [remoteOps]);

  // Debounced auto-save to backend
  const saveTimeoutRef = useRef<any>(null);
  const triggerSave = useCallback(
    (newElements: DrawingElement[]) => {
      if (!canDraw) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const json = JSON.stringify(newElements);
        onSavePage(currentPageIndex, activePage?.title || `Page ${currentPageIndex + 1}`, json);
      }, 400);
    },
    [canDraw, currentPageIndex, activePage?.title, onSavePage],
  );

  // Canvas size adjustment with ResizeObserver
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr * scale, dpr * scale);
        renderCanvas();
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [scale, elements, currentElement, gridMode, laserPoint]);

  // Master Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr / scale, canvas.height / dpr / scale);

    const width = canvas.width / dpr / scale;
    const height = canvas.height / dpr / scale;

    // 1. Draw Grid Background
    if (gridMode === "grid") {
      ctx.save();
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 0.8;
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    } else if (gridMode === "coordinate") {
      ctx.save();
      // Minor grid
      ctx.strokeStyle = "#F1F5F9";
      ctx.lineWidth = 0.8;
      const gridSize = 20;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Major axes (X and Y)
      const midX = Math.floor(width / 2);
      const midY = Math.floor(height / 2);

      ctx.strokeStyle = "#64748B";
      ctx.lineWidth = 1.5;

      // X Axis
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Y Axis
      ctx.beginPath();
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, height);
      ctx.stroke();

      // Axis labels & tick marks
      ctx.fillStyle = "#64748B";
      ctx.font = "10px sans-serif";
      ctx.fillText("(0,0)", midX + 4, midY - 4);
      ctx.fillText("+X", width - 20, midY - 6);
      ctx.fillText("+Y", midX + 6, 16);
      ctx.restore();
    }

    // 2. Render all stored elements + local in-progress + remote in-progress
    const allToRender = [...elements];
    if (remoteCurrentElement) allToRender.push(remoteCurrentElement);
    if (currentElement) allToRender.push(currentElement);

    allToRender.forEach((el) => {
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (el.type === "highlighter") {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = el.strokeWidth * 3;
      }

      if (el.type === "pen" || el.type === "highlighter") {
        if (el.points && el.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        }
      } else if (el.type === "line") {
        if (el.points && el.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          ctx.lineTo(el.points[1].x, el.points[1].y);
          ctx.stroke();
        }
      } else if (el.type === "arrow") {
        if (el.points && el.points.length >= 2) {
          const from = el.points[0];
          const to = el.points[1];
          const headlen = 12;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const angle = Math.atan2(dy, dx);

          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
      } else if (el.type === "rectangle") {
        if (el.x !== undefined && el.y !== undefined && el.width && el.height) {
          ctx.strokeRect(el.x, el.y, el.width, el.height);
        }
      } else if (el.type === "circle") {
        if (el.x !== undefined && el.y !== undefined && el.width && el.height) {
          const radiusX = Math.abs(el.width / 2);
          const radiusY = Math.abs(el.height / 2);
          const centerX = el.x + el.width / 2;
          const centerY = el.y + el.height / 2;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
      } else if (el.type === "triangle") {
        if (el.x !== undefined && el.y !== undefined && el.width && el.height) {
          ctx.beginPath();
          ctx.moveTo(el.x + el.width / 2, el.y);
          ctx.lineTo(el.x + el.width, el.y + el.height);
          ctx.lineTo(el.x, el.y + el.height);
          ctx.closePath();
          ctx.stroke();
        }
      } else if (el.type === "sticky") {
        if (el.x !== undefined && el.y !== undefined && el.width && el.height) {
          ctx.fillStyle = el.backgroundColor || "#FEF08A";
          ctx.strokeStyle = "#FACC15";
          ctx.lineWidth = 1;
          ctx.fillRect(el.x, el.y, el.width, el.height);
          ctx.strokeRect(el.x, el.y, el.width, el.height);

          if (el.text) {
            ctx.fillStyle = "#1E293B";
            ctx.font = "13px sans-serif";
            const lines = el.text.split("\n");
            lines.forEach((line, index) => {
              ctx.fillText(line, el.x! + 8, el.y! + 20 + index * 16);
            });
          }
        }
      } else if (el.type === "numberline") {
        if (el.x !== undefined && el.y !== undefined && el.width) {
          const startX = el.x;
          const endX = el.x + (el.width || 300);
          const y = el.y;

          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.stroke();

          // Ticks & numbers
          const ticks = 10;
          const step = (endX - startX) / ticks;
          ctx.font = "10px sans-serif";
          for (let i = 0; i <= ticks; i++) {
            const tickX = startX + i * step;
            ctx.beginPath();
            ctx.moveTo(tickX, y - 6);
            ctx.lineTo(tickX, y + 6);
            ctx.stroke();
            ctx.fillText((i - 5).toString(), tickX - 4, y + 18);
          }
        }
      } else if (el.type === "text" && el.text) {
        if (el.x !== undefined && el.y !== undefined) {
          ctx.font = `${el.fontSize || 16}px sans-serif`;
          ctx.fillText(el.text, el.x, el.y);
        }
      }

      ctx.restore();
    });

    // 3. Render Laser Pointer if active
    if (laserPoint) {
      ctx.save();
      ctx.fillStyle = "#EF4444";
      ctx.shadowColor = "#EF4444";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(laserPoint.x, laserPoint.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }

    if (remoteLaserPoint) {
      ctx.save();
      ctx.fillStyle = "#2563EB";
      ctx.shadowColor = "#2563EB";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(remoteLaserPoint.x, remoteLaserPoint.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Laser tag with author name
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#1E293B";
      ctx.fillText(remoteLaserPoint.authorName, remoteLaserPoint.x + 10, remoteLaserPoint.y + 4);
      ctx.restore();
    }
  }, [gridMode, elements, currentElement, remoteCurrentElement, laserPoint, remoteLaserPoint, scale]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer coordinate normalization
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const { x, y } = getCanvasCoords(e);

    if (activeTool === "laser") {
      setLaserPoint({ x, y });
      if (onBroadcastOp) {
        onBroadcastOp({ type: "laser", x, y, authorName, authorRole });
      }
      return;
    }

    if (activeTool === "text") {
      setTextInputState({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        text: "",
      });
      return;
    }

    if (activeTool === "eraser") {
      // Find element near click and remove it
      const remaining = elements.filter((el) => {
        if (el.points) {
          return !el.points.some((p) => Math.hypot(p.x - x, p.y - y) < 20);
        }
        if (el.x !== undefined && el.y !== undefined && el.width && el.height) {
          return !(x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height);
        }
        return true;
      });
      setElements(remaining);
      pushHistory(remaining);
      triggerSave(remaining);
      return;
    }

    setIsDrawing(true);

    if (activeTool === "pen" || activeTool === "highlighter") {
      const newEl: DrawingElement = {
        id: Date.now().toString(),
        type: activeTool,
        color: selectedColor,
        strokeWidth,
        points: [{ x, y }],
        authorRole,
        authorName,
      };
      setCurrentElement(newEl);
    } else if (
      activeTool === "line" ||
      activeTool === "arrow" ||
      activeTool === "rectangle" ||
      activeTool === "circle" ||
      activeTool === "triangle" ||
      activeTool === "sticky" ||
      activeTool === "numberline"
    ) {
      const newEl: DrawingElement = {
        id: Date.now().toString(),
        type: activeTool,
        color: selectedColor,
        strokeWidth,
        x,
        y,
        width: 0,
        height: 0,
        points: [{ x, y }, { x, y }],
        backgroundColor: activeTool === "sticky" ? "#FEF08A" : undefined,
        text: activeTool === "sticky" ? "Note:\n• Key concept" : undefined,
        authorRole,
        authorName,
      };
      setCurrentElement(newEl);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (activeTool === "laser") {
      setLaserPoint({ x, y });
      const now = Date.now();
      if (onBroadcastOp && now - lastBroadcastRef.current > 40) {
        lastBroadcastRef.current = now;
        onBroadcastOp({ type: "laser", x, y, authorName, authorRole });
      }
      return;
    }

    if (!isDrawing || !currentElement || !canDraw) return;

    let updated: DrawingElement;
    if (currentElement.type === "pen" || currentElement.type === "highlighter") {
      updated = {
        ...currentElement,
        points: [...(currentElement.points || []), { x, y }],
      };
      setCurrentElement(updated);
    } else {
      const startX = currentElement.x || 0;
      const startY = currentElement.y || 0;
      updated = {
        ...currentElement,
        width: x - startX,
        height: y - startY,
        points: [{ x: startX, y: startY }, { x, y }],
      };
      setCurrentElement(updated);
    }

    const now = Date.now();
    if (onBroadcastOp && now - lastBroadcastRef.current > 60) {
      lastBroadcastRef.current = now;
      onBroadcastOp({ type: "draw-progress", element: updated });
    }
  };

  const handlePointerUp = () => {
    if (activeTool === "laser") {
      setLaserPoint(null);
      if (onBroadcastOp) {
        onBroadcastOp({ type: "laser-clear" });
      }
      return;
    }

    if (!isDrawing || !currentElement) return;
    setIsDrawing(false);

    const finalizedElement: DrawingElement = {
      ...currentElement,
      authorRole,
      authorName,
    };
    const nextElements = [...elements, finalizedElement];
    setElements(nextElements);
    setCurrentElement(null);
    pushHistory(nextElements);
    triggerSave(nextElements);

    if (onBroadcastOp) {
      onBroadcastOp({ type: "draw-commit", element: finalizedElement });
    }
  };

  const handleClearStudentMarks = () => {
    const kept = elements.filter((el) => el.authorRole !== "student");
    setElements(kept);
    pushHistory(kept);
    triggerSave(kept);
    if (onBroadcastOp) {
      onBroadcastOp({ type: "clear-student-annotations" });
    }
    if (onClearStudentAnnotations) {
      onClearStudentAnnotations();
    }
  };

  const pushHistory = (newElements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setElements(history[prevStep]);
      triggerSave(history[prevStep]);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setElements(history[nextStep]);
      triggerSave(history[nextStep]);
    }
  };

  const handleClear = () => {
    setElements([]);
    pushHistory([]);
    onClearPage(currentPageIndex);
  };

  const handleTextSubmit = () => {
    if (!textInputState.text.trim()) {
      setTextInputState({ visible: false, x: 0, y: 0, text: "" });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (textInputState.x - rect.left) / scale;
    const y = (textInputState.y - rect.top) / scale;

    const newEl: DrawingElement = {
      id: Date.now().toString(),
      type: "text",
      x,
      y,
      text: textInputState.text,
      color: selectedColor,
      strokeWidth: 2,
      fontSize: strokeWidth * 4 + 10,
    };
    const nextElements = [...elements, newEl];
    setElements(nextElements);
    pushHistory(nextElements);
    triggerSave(nextElements);
    setTextInputState({ visible: false, x: 0, y: 0, text: "" });
  };

  const exportAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `whiteboard-${activePage?.title || "page"}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 relative overflow-hidden select-none">
      {/* ─── Top Whiteboard Toolbar ───────────────────────────────────── */}
      <div className="bg-white border-b border-stone-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs z-10">
        {/* Left Tools Group */}
        <div className="flex items-center gap-1">
          {[
            { id: "pen" as const, icon: Pencil, label: "Pen" },
            { id: "highlighter" as const, icon: Highlighter, label: "Highlighter" },
            { id: "eraser" as const, icon: Eraser, label: "Eraser" },
            { id: "laser" as const, icon: Sparkles, label: "Laser Pointer" },
            { id: "text" as const, icon: Type, label: "Text Note" },
            { id: "line" as const, icon: Minus, label: "Line" },
            { id: "arrow" as const, icon: MoveRight, label: "Arrow" },
            { id: "rectangle" as const, icon: Square, label: "Rectangle" },
            { id: "circle" as const, icon: CircleIcon, label: "Circle" },
            { id: "triangle" as const, icon: Triangle, label: "Triangle" },
            { id: "sticky" as const, icon: StickyNote, label: "Sticky Note" },
            { id: "numberline" as const, icon: Hash, label: "Number Line" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                activeTool === t.id
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-stone-100"
              }`}
              title={t.label}
            >
              <t.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Color Palette & Stroke Width */}
        <div className="flex items-center gap-2 border-x border-stone-200 px-2">
          {/* Colors */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  selectedColor === c ? "scale-125 ring-2 ring-teal-500 ring-offset-1" : "hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
                title={`Color: ${c}`}
              />
            ))}
          </div>

          {/* Stroke Widths */}
          <div className="flex items-center gap-1 ml-1">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`p-1 rounded text-xs font-bold transition-colors ${
                  strokeWidth === w
                    ? "bg-teal-100 text-teal-800"
                    : "text-slate-500 hover:bg-stone-100"
                }`}
                title={`${w}px stroke`}
              >
                <div
                  className="rounded-full bg-slate-700 mx-auto"
                  style={{ width: `${w + 2}px`, height: `${w + 2}px` }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Whiteboard Controls: Grid, Undo/Redo, Clear, Zoom */}
        <div className="flex items-center gap-1">
          {/* Grid Mode */}
          <button
            onClick={() => {
              setGridMode((prev) =>
                prev === "blank" ? "grid" : prev === "grid" ? "coordinate" : "blank",
              );
            }}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
              gridMode !== "blank"
                ? "bg-teal-50 border-teal-200 text-teal-700"
                : "border-stone-200 text-slate-600 hover:bg-stone-100"
            }`}
            title="Toggle Background Grid / Coordinate Plane"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span className="capitalize hidden sm:inline">{gridMode}</span>
          </button>

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyStep <= 0}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-stone-100 disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-stone-100 disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Clear Student Marks (Teacher Only) */}
          {isTeacher && (
            <button
              onClick={handleClearStudentMarks}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 transition-colors"
              title="Clear only student annotations, preserving teacher notes"
            >
              <Eraser className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Clear Student Marks</span>
            </button>
          )}

          {/* Clear All */}
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
            title="Clear Whiteboard"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Export PNG */}
          <button
            onClick={exportAsImage}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-stone-100"
            title="Download Canvas PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Whiteboard Multi-Page Tabs Bar ────────────────────────────── */}
      <div className="bg-stone-50 border-b border-stone-200 px-3 py-1 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1 overflow-x-auto">
          {pages.map((p) => (
            <button
              key={p.pageIndex}
              onClick={() => onSwitchPage(p.pageIndex)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                p.pageIndex === currentPageIndex
                  ? "bg-white text-teal-700 shadow-xs border border-stone-200"
                  : "text-slate-500 hover:text-slate-800 hover:bg-stone-200/60"
              }`}
            >
              <span>{p.title || `Page ${p.pageIndex + 1}`}</span>
            </button>
          ))}

          {isTeacher && (
            <button
              onClick={() => {
                const title = prompt("Enter new page title:", `Page ${pages.length + 1}`);
                if (title) onCreatePage(title);
              }}
              className="p-1 rounded-md text-teal-700 hover:bg-teal-50 border border-dashed border-teal-300 flex items-center gap-1 px-2"
              title="Add New Whiteboard Page"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Page</span>
            </button>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 text-slate-500">
          <button
            onClick={() => setScale((s) => Math.max(0.6, s - 0.1))}
            className="p-1 hover:bg-stone-200 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2.0, s + 0.1))}
            className="p-1 hover:bg-stone-200 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Canvas Workspace ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full relative bg-white cursor-crosshair overflow-hidden touch-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 block w-full h-full"
        />

        {/* Text Input Prompt overlay */}
        {textInputState.visible && (
          <div
            className="fixed z-50 bg-white p-2 rounded-xl shadow-2xl border border-stone-300 flex items-center gap-2"
            style={{ left: textInputState.x, top: textInputState.y }}
          >
            <input
              type="text"
              autoFocus
              value={textInputState.text}
              onChange={(e) => setTextInputState({ ...textInputState, text: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
              placeholder="Type text note..."
              className="px-2.5 py-1 text-sm border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
            />
            <Button size="sm" onClick={handleTextSubmit} className="bg-teal-600 text-white text-xs h-7">
              Add
            </Button>
          </div>
        )}

        {!canDraw && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-amber-500/90 text-slate-950 font-bold rounded-lg text-xs shadow-md">
            View Only Mode (Teacher controlled)
          </div>
        )}
      </div>
    </div>
  );
}
