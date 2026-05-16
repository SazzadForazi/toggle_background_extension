(function () {
  const ROOT_ID = "trading-draw-overlay-root";
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const STORAGE_KEY = "tdo-extension-state-v2";
  const pageKey = `${location.origin}${location.pathname}`;

  const toolGroups = [
    {
      tools: [
        { type: "cursor", label: "CUR", color: "#e2e8f0", width: 2 },
        { type: "trendLine", label: "TR", color: "#38bdf8", width: 2 },
        { type: "horizontalLine", label: "HL", color: "#facc15", width: 2 },
        { type: "verticalLine", label: "VL", color: "#fb923c", width: 2 },
        { type: "rectangle", label: "REC", color: "#38bdf8", width: 2 },
        { type: "text", label: "TXT", color: "#f8fafc", width: 2, defaultLabel: "Note" },
        { type: "arrow", label: "ARR", color: "#38bdf8", width: 2 },
        { type: "freehand", label: "PEN", color: "#38bdf8", width: 2.5 },
        { type: "eraser", label: "ERS", color: "#ef4444", width: 2 }
      ]
    },
    {
      tools: [
        { type: "support", label: "SUP", color: "#22c55e", width: 2, defaultLabel: "SUP" },
        { type: "resistance", label: "RES", color: "#ef4444", width: 2, defaultLabel: "RES" },
        { type: "demandZone", label: "DM", color: "#22c55e", width: 2, defaultLabel: "DM" },
        { type: "supplyZone", label: "SP", color: "#ef4444", width: 2, defaultLabel: "SP" },
        { type: "orderBlock", label: "OB", color: "#c084fc", width: 2, defaultLabel: "OB" },
        { type: "fvg", label: "FVG", color: "#f59e0b", width: 2, defaultLabel: "FVG" },
        { type: "liquidity", label: "LIQ", color: "#facc15", width: 2, defaultLabel: "LIQ" },
        { type: "entry", label: "EN", color: "#38bdf8", width: 2, defaultLabel: "Entry" },
        { type: "stopLoss", label: "SL", color: "#ef4444", width: 2, defaultLabel: "SL" },
        { type: "takeProfit", label: "TP", color: "#22c55e", width: 2, defaultLabel: "TP" },
        { type: "buyLabel", label: "BUY", color: "#22c55e", width: 2, defaultLabel: "BUY" },
        { type: "sellLabel", label: "SEL", color: "#ef4444", width: 2, defaultLabel: "SELL" }
      ]
    }
  ];

  const lineTools = new Set([
    "trendLine",
    "horizontalLine",
    "verticalLine",
    "arrow",
    "support",
    "resistance",
    "liquidity"
  ]);
  const rectTools = new Set(["rectangle", "demandZone", "supplyZone", "orderBlock", "fvg"]);
  const rectTagTools = new Set(["demandZone", "supplyZone", "orderBlock", "fvg"]);
  const labelTools = new Set(["text", "entry", "stopLoss", "takeProfit", "buyLabel", "sellLabel"]);

  const toolMap = new Map(toolGroups.flatMap((group) => group.tools).map((tool) => [tool.type, tool]));

  const defaultState = {
    toolbarOpen: true,
    activeTool: "cursor",
    interactionMode: "browse",
    objectsByPage: {},
    historyByPage: {},
    redoByPage: {}
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultState, ...JSON.parse(raw) } : structuredClone(defaultState);
    } catch {
      return structuredClone(defaultState);
    }
  }

  const state = loadState();
  state.interactionMode = "browse";
  if (!state.objectsByPage[pageKey]) state.objectsByPage[pageKey] = [];
  if (!state.historyByPage[pageKey]) state.historyByPage[pageKey] = [];
  if (!state.redoByPage[pageKey]) state.redoByPage[pageKey] = [];

  let selectedObjectId = null;
  let draft = null;
  let moveState = null;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.innerHTML = `
    <canvas class="tdo-canvas"></canvas>
    <div class="tdo-toolbar-shell">
      <button class="tdo-toggle" type="button" title="Toggle toolbar">◀</button>
      <div class="tdo-toolbar">
        <div class="tdo-tool-row"></div>
      </div>
    </div>
  `;
  document.documentElement.appendChild(root);

  const canvas = root.querySelector(".tdo-canvas");
  const context = canvas.getContext("2d");
  const toggleButton = root.querySelector(".tdo-toggle");
  const toolbar = root.querySelector(".tdo-toolbar");
  const toolRow = root.querySelector(".tdo-tool-row");
  const MAX_BADGE_TEXT = 14;
  const CHART_SELECTOR = [
    '[data-chart]',
    '[class*="chart"] canvas',
    '[class*="graph"] canvas',
    '[class*="trading"] canvas',
    '[class*="chart"] svg',
    '[class*="graph"] svg',
    "canvas",
    "svg"
  ].join(", ");

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getObjects() {
    return state.objectsByPage[pageKey] || [];
  }

  function getHistory() {
    return state.historyByPage[pageKey] || [];
  }

  function getRedo() {
    return state.redoByPage[pageKey] || [];
  }

  function pushHistory() {
    state.historyByPage[pageKey].push(structuredClone(getObjects()));
    state.redoByPage[pageKey] = [];
  }

  function canUndo() {
    return getHistory().length > 0;
  }

  function canRedo() {
    return getRedo().length > 0;
  }

  function undo() {
    if (!canUndo()) return;
    state.redoByPage[pageKey].push(structuredClone(getObjects()));
    state.objectsByPage[pageKey] = getHistory().pop();
    selectedObjectId = null;
    saveState();
    render();
  }

  function redo() {
    if (!canRedo()) return;
    state.historyByPage[pageKey].push(structuredClone(getObjects()));
    state.objectsByPage[pageKey] = getRedo().pop();
    selectedObjectId = null;
    saveState();
    render();
  }

  function deleteSelected() {
    if (!selectedObjectId) return;
    pushHistory();
    state.objectsByPage[pageKey] = getObjects().filter((item) => item.id !== selectedObjectId);
    selectedObjectId = null;
    saveState();
    render();
  }

  function clearAllObjects() {
    if (!getObjects().length) return;
    pushHistory();
    state.objectsByPage[pageKey] = [];
    selectedObjectId = null;
    saveState();
    render();
  }

  function sanitizeLabel(value, fallback = "") {
    const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    return (normalized || fallback).slice(0, MAX_BADGE_TEXT);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getViewportRect() {
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  function isVisibleRect(rect) {
    return rect.width >= 240 && rect.height >= 160 && rect.bottom > 0 && rect.right > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
  }

  function elementChartScore(element, rect) {
    let score = rect.width * rect.height;
    const text = `${element.tagName} ${element.id} ${element.className}`.toLowerCase();
    if (text.includes("chart")) score += 500000;
    if (text.includes("graph")) score += 300000;
    if (text.includes("trading")) score += 200000;
    if (text.includes("quote")) score += 150000;
    if (element.tagName === "CANVAS") score += 100000;
    return score;
  }

  function getChartRect() {
    const candidates = Array.from(document.querySelectorAll(CHART_SELECTOR));
    let bestRect = null;
    let bestScore = -1;

    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement) || root.contains(element)) {
        return;
      }

      const rect = element.getBoundingClientRect();
      if (!isVisibleRect(rect)) return;

      const score = elementChartScore(element, rect);
      if (score > bestScore) {
        bestScore = score;
        bestRect = rect;
      }
    });

    return bestRect
      ? {
          left: bestRect.left,
          top: bestRect.top,
          width: bestRect.width,
          height: bestRect.height
        }
      : null;
  }

  function getReferenceRect(space = "viewport") {
    return space === "chart" ? getChartRect() || getViewportRect() : getViewportRect();
  }

  function getObjectSpace(object) {
    return object && object.coordinateSpace === "chart" ? "chart" : "viewport";
  }

  function isEditableTarget(target) {
    return Boolean(
      target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLElement && target.isContentEditable)
    );
  }

  function isDrawingEnabled() {
    return state.interactionMode === "draw";
  }

  function syncCanvasMode() {
    canvas.style.pointerEvents = isDrawingEnabled() ? "auto" : "none";
  }

  function setInteractionMode(mode) {
    state.interactionMode = mode;
    saveState();
    render();
  }

  function activateTool(toolType) {
    state.activeTool = toolType;
    state.interactionMode = "draw";
    saveState();
    render();
  }

  function createToolButton(tool) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tdo-button";
    button.textContent = tool.label;
    button.title = tool.type;
    button.setAttribute("aria-label", tool.type);
    button.dataset.tool = tool.type;
    button.addEventListener("click", () => activateTool(tool.type));
    return button;
  }

  function createDivider() {
    const divider = document.createElement("div");
    divider.className = "tdo-divider";
    return divider;
  }

  function createActionButton(label, title, className, action, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tdo-action ${className || ""}`.trim();
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.dataset.action = action;
    button.addEventListener("click", handler);
    return button;
  }

  function buildToolbar() {
    toolGroups[0].tools.forEach((tool) => toolRow.appendChild(createToolButton(tool)));
    toolRow.appendChild(createDivider());
    toolGroups[1].tools.forEach((tool) => toolRow.appendChild(createToolButton(tool)));
    toolRow.appendChild(createDivider());

    toolRow.appendChild(
      createActionButton("UNDO", "Undo", "", "undo", () => {
        undo();
      })
    );

    toolRow.appendChild(
      createActionButton("REDO", "Redo", "", "redo", () => {
        redo();
      })
    );

    toolRow.appendChild(
      createActionButton("DRAW", "Enable drawing", "", "draw-mode", () => {
        setInteractionMode("draw");
      })
    );

    toolRow.appendChild(
      createActionButton("WEB", "Browse website normally", "", "browse-mode", () => {
        setInteractionMode("browse");
      })
    );

    toolRow.appendChild(
      createActionButton("DEL", "Delete selected", "is-danger", "delete", () => {
        deleteSelected();
      })
    );

    toolRow.appendChild(
      createActionButton("CLR", "Clear all", "is-warn", "clear", () => {
        clearAllObjects();
      })
    );
  }

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderCanvas();
  }

  function normalizePoint(point, space = "chart") {
    const rect = getReferenceRect(space);
    return {
      x: clamp((point.x - rect.left) / rect.width, 0, 1),
      y: clamp((point.y - rect.top) / rect.height, 0, 1)
    };
  }

  function pointFromEvent(event, space = "chart") {
    return normalizePoint({ x: event.clientX, y: event.clientY }, space);
  }

  function toScreen(point, object) {
    const rect = getReferenceRect(getObjectSpace(object));
    return {
      x: rect.left + point.x * rect.width,
      y: rect.top + point.y * rect.height
    };
  }

  function getRenderedLine(object) {
    let start = object.points[0];
    let end = object.points[1];
    if (!start || !end) return null;

    if (object.type === "horizontalLine" || object.type === "support" || object.type === "resistance" || object.type === "liquidity") {
      start = { x: 0, y: object.points[0].y };
      end = { x: 1, y: object.points[0].y };
    }

    if (object.type === "verticalLine") {
      start = { x: object.points[0].x, y: 0 };
      end = { x: object.points[0].x, y: 1 };
    }

    return { start, end };
  }

  function distanceToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));
    const px = start.x + clamped * dx;
    const py = start.y + clamped * dy;
    return Math.hypot(point.x - px, point.y - py);
  }

  function isInsideRect(point, rect) {
    const left = Math.min(rect[0].x, rect[1].x);
    const right = Math.max(rect[0].x, rect[1].x);
    const top = Math.min(rect[0].y, rect[1].y);
    const bottom = Math.max(rect[0].y, rect[1].y);
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  }

  function hitTest(point) {
    const objects = getObjects();
    for (let index = objects.length - 1; index >= 0; index -= 1) {
      const object = objects[index];
      const objectPoint = normalizePoint(point, getObjectSpace(object));

      if (rectTools.has(object.type) && object.points.length >= 2 && isInsideRect(objectPoint, object.points)) {
        return object;
      }

      if (labelTools.has(object.type) && object.points[0] && Math.hypot(objectPoint.x - object.points[0].x, objectPoint.y - object.points[0].y) < 0.03) {
        return object;
      }

      if (object.type === "freehand" && object.points.length > 1) {
        for (let i = 0; i < object.points.length - 1; i += 1) {
          if (distanceToSegment(objectPoint, object.points[i], object.points[i + 1]) < 0.018) return object;
        }
      }

      if (lineTools.has(object.type) && object.points.length >= 2) {
        const rendered = getRenderedLine(object);
        if (rendered && distanceToSegment(objectPoint, rendered.start, rendered.end) < 0.018) return object;
      }
    }

    return null;
  }

  function normalizeRect(points) {
    const left = Math.min(points[0].x, points[1].x);
    const right = Math.max(points[0].x, points[1].x);
    const top = Math.min(points[0].y, points[1].y);
    const bottom = Math.max(points[0].y, points[1].y);
    return [{ x: left, y: top }, { x: right, y: bottom }];
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawLabel(object) {
    const anchor = toScreen(object.points[0], object);
    const label = sanitizeLabel(object.label, object.type);
    context.font = "600 12px 'Segoe UI'";
    const width = context.measureText(label).width + 24;
    context.fillStyle = `${object.color}22`;
    context.strokeStyle = object.color;
    context.lineWidth = 1.2;
    roundRect(context, anchor.x + 10, anchor.y - 30, width, 26, 10);
    context.fill();
    context.stroke();
    context.fillStyle = "#f8fafc";
    context.fillText(label, anchor.x + 22, anchor.y - 13);
    context.beginPath();
    context.fillStyle = object.color;
    context.arc(anchor.x, anchor.y, 5, 0, Math.PI * 2);
    context.fill();
  }

  function getObjectTag(object) {
    const config = toolMap.get(object.type);
    return sanitizeLabel(object.label, config ? config.defaultLabel || config.label : object.type);
  }

  function getObjectTagAnchor(object) {
    if (rectTools.has(object.type) && object.points.length >= 2) {
      return toScreen({
        x: Math.min(object.points[0].x, object.points[1].x),
        y: Math.min(object.points[0].y, object.points[1].y)
      }, object);
    }

    if (lineTools.has(object.type) && object.points[0]) {
      const rendered = getRenderedLine(object);
      if (rendered) return toScreen(rendered.start, object);
    }

    return object.points[0] ? toScreen(object.points[0], object) : null;
  }

  function drawSelectedTag(object) {
    const tag = getObjectTag(object);
    const anchor = getObjectTagAnchor(object);
    if (!tag || !anchor) return;

    context.save();
    context.font = "700 10px 'Segoe UI'";
    const width = Math.max(30, context.measureText(tag).width + 16);
    const x = clamp(anchor.x + 8, 8, window.innerWidth - width - 8);
    const y = clamp(anchor.y - 24, 8, window.innerHeight - 28);
    context.fillStyle = "rgba(8, 17, 31, 0.92)";
    context.strokeStyle = object.color;
    context.lineWidth = 1;
    roundRect(context, x, y, width, 20, 8);
    context.fill();
    context.stroke();
    context.fillStyle = "#f8fafc";
    context.fillText(tag, x + 8, y + 13);
    context.restore();
  }

  function drawRectTag(object) {
    if (!rectTagTools.has(object.type) || object.points.length < 2) return;

    const tag = getObjectTag(object);
    const left = Math.min(object.points[0].x, object.points[1].x);
    const top = Math.min(object.points[0].y, object.points[1].y);
    const anchor = toScreen({ x: left, y: top }, object);
    const rect = getReferenceRect(getObjectSpace(object));

    context.save();
    context.font = "700 10px 'Segoe UI'";
    const width = Math.max(30, context.measureText(tag).width + 16);
    const rectWidth = Math.abs(object.points[1].x - object.points[0].x) * rect.width;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const preferredX = rectWidth >= width + 16 ? anchor.x + 8 : anchor.x - width - 8;
    const x = clamp(preferredX, 8, maxX);
    const y = clamp(anchor.y + 8, 8, window.innerHeight - 28);
    context.fillStyle = "rgba(8, 17, 31, 0.92)";
    context.strokeStyle = object.color;
    context.lineWidth = 1;
    roundRect(context, x, y, width, 20, 8);
    context.fill();
    context.stroke();
    context.fillStyle = "#f8fafc";
    context.fillText(tag, x + 8, y + 13);
    context.restore();
  }

  function drawArrowHead(start, end, color, object) {
    const s = toScreen(start, object);
    const e = toScreen(end, object);
    const angle = Math.atan2(e.y - s.y, e.x - s.x);
    const head = 14;
    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(e.x, e.y);
    context.lineTo(e.x - head * Math.cos(angle - Math.PI / 7), e.y - head * Math.sin(angle - Math.PI / 7));
    context.moveTo(e.x, e.y);
    context.lineTo(e.x - head * Math.cos(angle + Math.PI / 7), e.y - head * Math.sin(angle + Math.PI / 7));
    context.stroke();
  }

  function drawObject(object, isSelected) {
    context.save();
    context.setLineDash([]);
    context.lineWidth = object.width || 2;
    context.strokeStyle = object.color;
    context.fillStyle = object.color;

    if (lineTools.has(object.type) && object.points.length >= 2) {
      const rendered = getRenderedLine(object);
      if (rendered) {
        const start = toScreen(rendered.start, object);
        const end = toScreen(rendered.end, object);
        if (object.type === "liquidity") context.setLineDash([10, 8]);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        if (object.type === "arrow") drawArrowHead(rendered.start, rendered.end, object.color, object);
      }
    }

    if (rectTools.has(object.type) && object.points.length >= 2) {
      const a = toScreen(object.points[0], object);
      const b = toScreen(object.points[1], object);
      context.globalAlpha = 0.18;
      context.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      context.globalAlpha = 0.95;
      context.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      drawRectTag(object);
    }

    if (object.type === "freehand" && object.points.length > 1) {
      context.lineJoin = "round";
      context.lineCap = "round";
      context.beginPath();
      const first = toScreen(object.points[0], object);
      context.moveTo(first.x, first.y);
      for (let i = 1; i < object.points.length; i += 1) {
        const point = toScreen(object.points[i], object);
        context.lineTo(point.x, point.y);
      }
      context.stroke();
    }

    if (labelTools.has(object.type) && object.points[0]) {
      drawLabel(object);
    }

    if (isSelected && object.points[0]) {
      if (!labelTools.has(object.type) && !rectTagTools.has(object.type)) {
        drawSelectedTag(object);
      }
      const anchor = toScreen(object.points[0], object);
      context.beginPath();
      context.fillStyle = "#ffffff";
      context.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  function renderCanvas() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    getObjects().forEach((object) => drawObject(object, object.id === selectedObjectId));
    if (draft) drawObject(draft, false);
  }

  function render() {
    root.querySelectorAll(".tdo-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tool === state.activeTool);
    });

    root.querySelectorAll(".tdo-action").forEach((button) => {
      const action = button.dataset.action;
      const active =
        (action === "draw-mode" && state.interactionMode === "draw") ||
        (action === "browse-mode" && state.interactionMode === "browse");
      button.classList.toggle("is-active", active);
      const disabled =
        (action === "undo" && !canUndo()) ||
        (action === "redo" && !canRedo()) ||
        (action === "delete" && !selectedObjectId) ||
        (action === "clear" && !getObjects().length);
      button.disabled = disabled;
    });

    toolbar.classList.toggle("is-collapsed", !state.toolbarOpen);
    toggleButton.textContent = state.toolbarOpen ? "◀" : "▶";
    syncCanvasMode();
    renderCanvas();
  }

  function createObjectFromDraft(rawDraft) {
    const points = rectTools.has(rawDraft.type) && rawDraft.points.length >= 2 ? normalizeRect(rawDraft.points) : rawDraft.points;
    return {
      id: rawDraft.id,
      type: rawDraft.type,
      points,
      coordinateSpace: rawDraft.coordinateSpace || "viewport",
      color: rawDraft.color,
      width: rawDraft.width,
      label: rawDraft.label || "",
      createdAt: new Date().toISOString()
    };
  }

  function beginMove(object, point) {
    selectedObjectId = object.id;
    moveState = { objectId: object.id, lastPoint: point, didMove: false, coordinateSpace: getObjectSpace(object) };
  }

  function updateMove(point) {
    if (!moveState) return;

    const normalizedPoint = normalizePoint(point, moveState.coordinateSpace);
    const deltaX = normalizedPoint.x - moveState.lastPoint.x;
    const deltaY = normalizedPoint.y - moveState.lastPoint.y;
    if (deltaX === 0 && deltaY === 0) return;

    if (!moveState.didMove) {
      pushHistory();
      moveState.didMove = true;
    }

    moveState.lastPoint = normalizedPoint;

    state.objectsByPage[pageKey] = getObjects().map((object) => {
      if (object.id !== moveState.objectId) return object;
      const nextPoints = object.points.map((entry) => ({
        x: Math.min(1, Math.max(0, entry.x + deltaX)),
        y: Math.min(1, Math.max(0, entry.y + deltaY))
      }));
      return {
        ...object,
        points: rectTools.has(object.type) && nextPoints.length >= 2 ? normalizeRect(nextPoints) : nextPoints
      };
    });

    render();
  }

  function commitDraft() {
    if (!draft) return;

    if (draft.type === "freehand" && draft.points.length < 2) {
      draft = null;
      render();
      return;
    }

    if ((lineTools.has(draft.type) || rectTools.has(draft.type)) && draft.points.length < 2) {
      draft = null;
      render();
      return;
    }

    pushHistory();
    const object = createObjectFromDraft(draft);
    state.objectsByPage[pageKey] = [...getObjects(), object];
    selectedObjectId = object.id;
    draft = null;
    saveState();
    render();
  }

  function toolDefaults(type) {
    const config = toolMap.get(type);
    return {
      color: config ? config.color : "#38bdf8",
      width: config ? config.width : 2,
      label: config ? config.defaultLabel || "" : ""
    };
  }

  toggleButton.addEventListener("click", () => {
    state.toolbarOpen = !state.toolbarOpen;
    saveState();
    render();
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!isDrawingEnabled()) return;

    const screenPoint = { x: event.clientX, y: event.clientY };
    const point = pointFromEvent(event);
    const hit = hitTest(screenPoint);
    const activeTool = state.activeTool;
    canvas.setPointerCapture(event.pointerId);

    if (activeTool === "eraser") {
      if (hit) {
        pushHistory();
        state.objectsByPage[pageKey] = getObjects().filter((item) => item.id !== hit.id);
        selectedObjectId = null;
        saveState();
        render();
      }
      return;
    }

    if (activeTool === "cursor") {
      if (hit) {
        beginMove(hit, normalizePoint(screenPoint, getObjectSpace(hit)));
      } else {
        selectedObjectId = null;
        render();
      }
      return;
    }

    const defaults = toolDefaults(activeTool);
    const label = labelTools.has(activeTool) ? window.prompt("Enter label", defaults.label || "Label") : defaults.label;

    if (labelTools.has(activeTool) && label === null) {
      return;
    }

    draft = {
      id: `tdo_${Math.random().toString(36).slice(2, 11)}`,
      type: activeTool,
      coordinateSpace: getChartRect() ? "chart" : "viewport",
      color: defaults.color,
      width: defaults.width,
      label: sanitizeLabel(label, defaults.label),
      points: labelTools.has(activeTool) ? [point] : activeTool === "freehand" ? [point] : [point, point]
    };

    if (labelTools.has(activeTool)) {
      commitDraft();
      return;
    }

    render();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!isDrawingEnabled()) return;

    const screenPoint = { x: event.clientX, y: event.clientY };
    const point = draft ? pointFromEvent(event, draft.coordinateSpace || "chart") : screenPoint;

    if (draft) {
      if (draft.type === "freehand") {
        draft.points.push(point);
      } else if (draft.points.length === 1) {
        draft.points = [draft.points[0], point];
      } else {
        draft.points[draft.points.length - 1] = point;
      }
      render();
      return;
    }

    if (moveState) {
      updateMove(screenPoint);
    }
  });

  function finishPointer(event) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (draft) {
      commitDraft();
    }

    if (moveState && moveState.didMove) {
      saveState();
    }

    moveState = null;
  }

  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", (event) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === "Escape") {
      setInteractionMode(state.interactionMode === "draw" ? "browse" : "draw");
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))
    ) {
      event.preventDefault();
      redo();
    }

    if (event.key === "Delete" && selectedObjectId) {
      deleteSelected();
    }
  });

  buildToolbar();
  resizeCanvas();
  saveState();
  render();
})();
