import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { analysisTools, primaryTools } from "./DrawingToolbar";
import { useDrawingStore } from "./useDrawingStore";
import type { DrawObject, Point, ToolConfig, ToolType } from "./types";

type DrawingCanvasProps = {
  className?: string;
};

type DraftState = {
  id: string;
  points: Point[];
  color: string;
  width: number;
  type: ToolType;
  label?: string;
};

type InteractionState =
  | { mode: "idle" }
  | { mode: "drawing"; draft: DraftState }
  | { mode: "moving"; objectId: string; lastPoint: Point };

const toolMap = new Map<ToolType, ToolConfig>([...primaryTools, ...analysisTools].map((tool) => [tool.type, tool]));

const lineLikeTools = new Set<ToolType>([
  "trendLine",
  "horizontalLine",
  "verticalLine",
  "arrow",
  "support",
  "resistance",
  "liquidity",
]);

const boxLikeTools = new Set<ToolType>(["rectangle", "demandZone", "supplyZone", "orderBlock", "fvg"]);

const labelTools = new Set<ToolType>(["text", "entry", "stopLoss", "takeProfit", "buyLabel", "sellLabel"]);

const markerTools = new Set<ToolType>(["entry", "stopLoss", "takeProfit", "buyLabel", "sellLabel"]);

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const createId = () => `draw_${Math.random().toString(36).slice(2, 10)}`;

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const px = start.x + clampedT * dx;
  const py = start.y + clampedT * dy;
  return Math.hypot(point.x - px, point.y - py);
};

const normalizeRectPoints = (start: Point, end: Point): Point[] => {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);

  return [
    { x: left, y: top },
    { x: right, y: bottom },
  ];
};

const getToolDefaults = (tool: ToolType) => {
  const config = toolMap.get(tool);

  return {
    color: config?.color ?? "#38bdf8",
    width: config?.width ?? (tool === "freehand" ? 0.0035 : 0.0025),
    label: config?.defaultLabel,
  };
};

const isPointInsideRect = (point: Point, rect: Point[]) => {
  const [start, end] = rect;
  return point.x >= start.x && point.x <= end.x && point.y >= start.y && point.y <= end.y;
};

const moveObjectPoints = (object: DrawObject, delta: Point) =>
  object.points.map((point) => ({
    x: clamp(point.x + delta.x),
    y: clamp(point.y + delta.y),
  }));

const getRenderedLinePoints = (object: DrawObject) => {
  let start = object.points[0];
  let end = object.points[1];

  if (!start || !end) {
    return null;
  }

  if (object.type === "horizontalLine" || object.type === "support" || object.type === "resistance" || object.type === "liquidity") {
    start = { x: 0, y: object.points[0].y };
    end = { x: 1, y: object.points[0].y };
  }

  if (object.type === "verticalLine") {
    start = { x: object.points[0].x, y: 0 };
    end = { x: object.points[0].x, y: 1 };
  }

  return { start, end };
};

const hitTestObject = (point: Point, objects: DrawObject[]) => {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const object = objects[index];

    if (boxLikeTools.has(object.type) && object.points.length >= 2) {
      if (isPointInsideRect(point, object.points)) {
        return object;
      }
    }

    if (labelTools.has(object.type) && object.points[0]) {
      const anchor = object.points[0];
      if (Math.hypot(point.x - anchor.x, point.y - anchor.y) < 0.03) {
        return object;
      }
    }

    if (object.type === "freehand" && object.points.length > 1) {
      for (let segment = 0; segment < object.points.length - 1; segment += 1) {
        if (distanceToSegment(point, object.points[segment], object.points[segment + 1]) < 0.015) {
          return object;
        }
      }
    }

    if (lineLikeTools.has(object.type) && object.points.length >= 2) {
      const renderedLine = getRenderedLinePoints(object);
      if (renderedLine && distanceToSegment(point, renderedLine.start, renderedLine.end) < 0.015) {
        return object;
      }
    }
  }

  return null;
};

const DrawingCanvas = ({ className }: DrawingCanvasProps) => {
  const {
    objects,
    selectedObjectId,
    activeTool,
    addObject,
    updateObject,
    setSelectedObjectId,
    deleteObject,
  } = useDrawingStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const interactionRef = useRef<InteractionState>({ mode: "idle" });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [revision, setRevision] = useState(0);

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    canvas.width = size.width * ratio;
    canvas.height = size.height * ratio;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    const drawLabelBubble = (label: string, point: Point, color: string) => {
      const x = point.x * size.width;
      const y = point.y * size.height;
      context.font = "600 12px 'Segoe UI'";
      const labelWidth = context.measureText(label).width + 24;
      context.fillStyle = `${color}22`;
      context.strokeStyle = color;
      context.lineWidth = 1.25;
      context.beginPath();
      context.roundRect(x + 10, y - 30, labelWidth, 26, 10);
      context.fill();
      context.stroke();
      context.fillStyle = "#f8fafc";
      context.fillText(label, x + 22, y - 13);
      context.beginPath();
      context.fillStyle = color;
      context.arc(x, y, 5, 0, Math.PI * 2);
      context.fill();
    };

    const drawArrowHead = (start: Point, end: Point, color: string) => {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = 14;
      const x = end.x * size.width;
      const y = end.y * size.height;

      context.strokeStyle = color;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(
        x - headLength * Math.cos(angle - Math.PI / 7),
        y - headLength * Math.sin(angle - Math.PI / 7),
      );
      context.moveTo(x, y);
      context.lineTo(
        x - headLength * Math.cos(angle + Math.PI / 7),
        y - headLength * Math.sin(angle + Math.PI / 7),
      );
      context.stroke();
    };

    const drawObject = (object: DrawObject, isSelected: boolean) => {
      const width = Math.max(object.width * Math.min(size.width, size.height), 1.5);
      const primary = object.color;
      context.lineWidth = width;
      context.strokeStyle = primary;
      context.fillStyle = primary;
      context.setLineDash([]);
      context.globalAlpha = 1;

      if (lineLikeTools.has(object.type) && object.points.length >= 2) {
        const renderedLine = getRenderedLinePoints(object);
        if (!renderedLine) {
          return;
        }

        const { start, end } = renderedLine;

        if (object.type === "liquidity") {
          context.setLineDash([10, 8]);
        }

        context.beginPath();
        context.moveTo(start.x * size.width, start.y * size.height);
        context.lineTo(end.x * size.width, end.y * size.height);
        context.stroke();

        if (object.type === "arrow") {
          drawArrowHead(start, end, primary);
        }
      }

      if (boxLikeTools.has(object.type) && object.points.length >= 2) {
        const [start, end] = object.points;
        const left = start.x * size.width;
        const top = start.y * size.height;
        const rectWidth = (end.x - start.x) * size.width;
        const rectHeight = (end.y - start.y) * size.height;
        context.globalAlpha = 0.18;
        context.fillRect(left, top, rectWidth, rectHeight);
        context.globalAlpha = 0.95;
        context.strokeRect(left, top, rectWidth, rectHeight);
      }

      if (object.type === "freehand" && object.points.length > 1) {
        context.beginPath();
        context.lineJoin = "round";
        context.lineCap = "round";
        context.moveTo(object.points[0].x * size.width, object.points[0].y * size.height);
        for (let index = 1; index < object.points.length; index += 1) {
          context.lineTo(object.points[index].x * size.width, object.points[index].y * size.height);
        }
        context.stroke();
      }

      if (labelTools.has(object.type) && object.points[0]) {
        drawLabelBubble(object.label ?? object.type, object.points[0], primary);
      }

      if (isSelected) {
        const anchor = object.points[0];
        if (anchor) {
          context.beginPath();
          context.fillStyle = "#f8fafc";
          context.arc(anchor.x * size.width, anchor.y * size.height, 4, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    objects.forEach((object) => drawObject(object, object.id === selectedObject?.id));

    if (interactionRef.current.mode === "drawing") {
      drawObject(
        {
          id: interactionRef.current.draft.id,
          type: interactionRef.current.draft.type,
          points: interactionRef.current.draft.points,
          color: interactionRef.current.draft.color,
          width: interactionRef.current.draft.width,
          label: interactionRef.current.draft.label,
          createdAt: new Date().toISOString(),
        },
        false,
      );
    }
  }, [objects, revision, selectedObject, size.height, size.width]);

  const getRelativePoint = (event: PointerEvent | ReactPointerEvent<HTMLCanvasElement>): Point => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) {
      return { x: 0, y: 0 };
    }

    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    };
  };

  const commitDraft = (draft: DraftState) => {
    const preparedPoints =
      boxLikeTools.has(draft.type) && draft.points.length >= 2
        ? normalizeRectPoints(draft.points[0], draft.points[draft.points.length - 1])
        : draft.points;

    if (draft.type === "freehand" && draft.points.length < 2) {
      return;
    }

    if ((lineLikeTools.has(draft.type) || boxLikeTools.has(draft.type)) && preparedPoints.length < 2) {
      return;
    }

    addObject({
      id: draft.id,
      type: draft.type,
      points: preparedPoints,
      color: draft.color,
      width: draft.width,
      label: draft.label,
      createdAt: new Date().toISOString(),
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getRelativePoint(event);
    const hitObject = hitTestObject(point, objects);

    if (activeTool === "eraser") {
      if (hitObject) {
        deleteObject(hitObject.id);
      }
      return;
    }

    if (activeTool === "cursor") {
      if (hitObject) {
        setSelectedObjectId(hitObject.id);
        updateObject(hitObject.id, (object) => object);
        interactionRef.current = {
          mode: "moving",
          objectId: hitObject.id,
          lastPoint: point,
        };
        return;
      }

      setSelectedObjectId(null);
      interactionRef.current = { mode: "idle" };
      return;
    }

    const defaults = getToolDefaults(activeTool);
    const label =
      labelTools.has(activeTool)
        ? prompt("Enter label", defaults.label ?? "Label") ?? defaults.label ?? "Label"
        : defaults.label;

    if (labelTools.has(activeTool) && !label) {
      return;
    }

    const initialPoints = markerTools.has(activeTool) || labelTools.has(activeTool) ? [point] : [point, point];
    interactionRef.current = {
      mode: "drawing",
      draft: {
        id: createId(),
        points: activeTool === "freehand" ? [point] : initialPoints,
        color: defaults.color,
        width: defaults.width,
        type: activeTool,
        label,
      },
    };

    if (labelTools.has(activeTool)) {
      commitDraft(interactionRef.current.draft);
      interactionRef.current = { mode: "idle" };
    }

    setRevision((value) => value + 1);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getRelativePoint(event);
    const interaction = interactionRef.current;

    if (interaction.mode === "drawing") {
      if (interaction.draft.type === "freehand") {
        interaction.draft.points.push(point);
      } else if (interaction.draft.points.length === 1) {
        interaction.draft.points = [interaction.draft.points[0], point];
      } else {
        interaction.draft.points[interaction.draft.points.length - 1] = point;
      }
      setRevision((value) => value + 1);
    }

    if (interaction.mode === "moving") {
      const delta = {
        x: point.x - interaction.lastPoint.x,
        y: point.y - interaction.lastPoint.y,
      };

      interaction.lastPoint = point;

      updateObject(interaction.objectId, (object) => ({
        ...object,
        points:
          boxLikeTools.has(object.type) && object.points.length >= 2
            ? normalizeRectPoints(
                {
                  x: clamp(object.points[0].x + delta.x),
                  y: clamp(object.points[0].y + delta.y),
                },
                {
                  x: clamp(object.points[1].x + delta.x),
                  y: clamp(object.points[1].y + delta.y),
                },
              )
            : moveObjectPoints(object, delta),
      }), { skipHistory: true });
    }
  };

  const finishInteraction = (event?: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const interaction = interactionRef.current;

    if (interaction.mode === "drawing") {
      commitDraft(interaction.draft);
    }

    interactionRef.current = { mode: "idle" };
    setRevision((value) => value + 1);
  };

  return (
    <div ref={containerRef} className={className}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-20 h-full w-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishInteraction}
        onPointerCancel={finishInteraction}
        onPointerLeave={finishInteraction}
      />
    </div>
  );
};

export default DrawingCanvas;
