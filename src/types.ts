import type { LucideIcon } from "lucide-react";

export type ToolType =
  | "cursor"
  | "trendLine"
  | "horizontalLine"
  | "verticalLine"
  | "rectangle"
  | "text"
  | "arrow"
  | "freehand"
  | "eraser"
  | "support"
  | "resistance"
  | "demandZone"
  | "supplyZone"
  | "orderBlock"
  | "fvg"
  | "liquidity"
  | "entry"
  | "stopLoss"
  | "takeProfit"
  | "buyLabel"
  | "sellLabel";

export type BackgroundMode = "dark" | "light";

export type Point = {
  x: number;
  y: number;
};

export type DrawObject = {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  width: number;
  label?: string;
  createdAt: string;
};

export type HistorySnapshot = {
  objects: DrawObject[];
  selectedObjectId: string | null;
};

export type DrawingState = {
  objects: DrawObject[];
  selectedObjectId: string | null;
  activeTool: ToolType;
  toolbarOpen: boolean;
  backgroundMode: BackgroundMode;
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
};

export type ToolConfig = {
  type: ToolType;
  label: string;
  icon: LucideIcon;
  color: string;
  width?: number;
  defaultLabel?: string;
};
