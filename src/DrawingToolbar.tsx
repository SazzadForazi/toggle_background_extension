import {
  ArrowBigUp,
  ChartCandlestick,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Hand,
  Landmark,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Pencil,
  RectangleHorizontal,
  RotateCcw,
  RotateCw,
  ScanLine,
  Square,
  Target,
  Trash2,
  Type,
} from "lucide-react";
import ToolButton from "./ToolButton";
import { useDrawingStore } from "./useDrawingStore";
import type { ToolConfig } from "./types";

const primaryTools: ToolConfig[] = [
  { type: "cursor", label: "Cursor / Select", icon: Hand, color: "#e2e8f0" },
  { type: "trendLine", label: "Trend Line", icon: ChartCandlestick, color: "#38bdf8" },
  { type: "horizontalLine", label: "Horizontal Line", icon: Minus, color: "#facc15" },
  { type: "verticalLine", label: "Vertical Line", icon: MoveVertical, color: "#f97316" },
  { type: "rectangle", label: "Rectangle Zone", icon: Square, color: "#38bdf8" },
  { type: "text", label: "Text Label", icon: Type, color: "#f8fafc", defaultLabel: "Note" },
  { type: "arrow", label: "Arrow", icon: ArrowBigUp, color: "#38bdf8" },
  { type: "freehand", label: "Freehand Pen", icon: Pencil, color: "#38bdf8", width: 0.0035 },
  { type: "eraser", label: "Eraser", icon: Eraser, color: "#ef4444" },
];

const analysisTools: ToolConfig[] = [
  { type: "support", label: "Support Line", icon: MoveHorizontal, color: "#22c55e" },
  { type: "resistance", label: "Resistance Line", icon: MoveHorizontal, color: "#ef4444" },
  { type: "demandZone", label: "Demand Zone", icon: RectangleHorizontal, color: "#22c55e" },
  { type: "supplyZone", label: "Supply Zone", icon: RectangleHorizontal, color: "#ef4444" },
  { type: "orderBlock", label: "Order Block", icon: Landmark, color: "#c084fc" },
  { type: "fvg", label: "FVG Zone", icon: ScanLine, color: "#f59e0b" },
  { type: "liquidity", label: "Liquidity Line", icon: Minus, color: "#facc15" },
  { type: "entry", label: "Entry Marker", icon: Target, color: "#38bdf8", defaultLabel: "Entry" },
  { type: "stopLoss", label: "Stop Loss Marker", icon: Target, color: "#ef4444", defaultLabel: "SL" },
  { type: "takeProfit", label: "Take Profit Marker", icon: Target, color: "#22c55e", defaultLabel: "TP" },
  { type: "buyLabel", label: "Buy Label", icon: ArrowBigUp, color: "#22c55e", defaultLabel: "BUY" },
  { type: "sellLabel", label: "Sell Label", icon: ArrowBigUp, color: "#ef4444", defaultLabel: "SELL" },
];

const sectionClassName =
  "rounded-[1.6rem] border border-slate-800/90 bg-panel/90 p-3 shadow-2xl backdrop-blur-xl";

const DrawingToolbar = () => {
  const {
    activeTool,
    toolbarOpen,
    toggleToolbar,
    setActiveTool,
    deleteSelectedObject,
    undo,
    redo,
    clearAll,
    selectedObjectId,
    undoStack,
    redoStack,
  } = useDrawingStore();

  return (
    <div className="pointer-events-auto absolute left-5 top-5 z-30 flex items-start gap-3">
      <button
        type="button"
        onClick={toggleToolbar}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-panel/90 text-slate-100 shadow-xl backdrop-blur transition hover:border-accent hover:text-accent"
        title={toolbarOpen ? "Collapse toolbar" : "Expand toolbar"}
      >
        {toolbarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>

      <div
        className={`flex origin-left gap-3 transition-all duration-300 ${
          toolbarOpen ? "translate-x-0 scale-100 opacity-100" : "-translate-x-8 scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className={`${sectionClassName} flex max-h-[calc(100vh-3rem)] w-[4.35rem] flex-col gap-2 overflow-y-auto`}>
          {primaryTools.map((tool) => (
            <ToolButton key={tool.type} tool={tool} isActive={activeTool === tool.type} onClick={setActiveTool} />
          ))}
        </div>

        <div className={`${sectionClassName} flex max-h-[calc(100vh-3rem)] w-[4.35rem] flex-col gap-2 overflow-y-auto`}>
          {analysisTools.map((tool) => (
            <ToolButton key={tool.type} tool={tool} isActive={activeTool === tool.type} onClick={setActiveTool} />
          ))}
        </div>

        <div className={`${sectionClassName} flex w-[4.35rem] flex-col gap-2`}>
          <button
            type="button"
            title="Undo"
            onClick={undo}
            disabled={!undoStack.length}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Redo"
            onClick={redo}
            disabled={!redoStack.length}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCw className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Delete Selected Object"
            onClick={deleteSelectedObject}
            disabled={!selectedObjectId}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-950 bg-red-500/10 text-red-300 transition hover:border-red-500/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Clear All Drawings"
            onClick={clearAll}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-950 bg-amber-500/10 text-amber-200 transition hover:border-amber-400/70 hover:bg-amber-400/20"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawingToolbar;
export { analysisTools, primaryTools };
