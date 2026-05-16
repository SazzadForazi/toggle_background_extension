import { useSyncExternalStore } from "react";
import type { BackgroundMode, DrawObject, DrawingState, HistorySnapshot, ToolType } from "./types";

const STORAGE_KEY = "trading-drawing-objects";
const BG_STORAGE_KEY = "trading-drawing-background-mode";

type Store = DrawingState & {
  hydrate: () => void;
  setActiveTool: (tool: ToolType) => void;
  toggleToolbar: () => void;
  setSelectedObjectId: (id: string | null) => void;
  addObject: (object: DrawObject) => void;
  updateObject: (id: string, updater: (object: DrawObject) => DrawObject, options?: { skipHistory?: boolean }) => void;
  deleteObject: (id: string) => void;
  deleteSelectedObject: () => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  toggleBackgroundMode: () => void;
};

const listeners = new Set<() => void>();

const snapshotFromState = (state: DrawingState): HistorySnapshot => ({
  objects: structuredClone(state.objects),
  selectedObjectId: state.selectedObjectId,
});

const persistObjects = (objects: DrawObject[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(objects));
};

const persistBackgroundMode = (backgroundMode: BackgroundMode) => {
  localStorage.setItem(BG_STORAGE_KEY, backgroundMode);
};

const pushUndoState = (state: DrawingState): DrawingState => ({
  ...state,
  undoStack: [...state.undoStack, snapshotFromState(state)],
  redoStack: [],
});

let storeState: DrawingState = {
  objects: [],
  selectedObjectId: null,
  activeTool: "cursor",
  toolbarOpen: true,
  backgroundMode: "dark",
  undoStack: [],
  redoStack: [],
};

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setState = (updater: (state: DrawingState) => DrawingState) => {
  storeState = updater(storeState);
  persistObjects(storeState.objects);
  persistBackgroundMode(storeState.backgroundMode);
  emit();
};

const store: Store = {
  ...storeState,
  hydrate: () => {
    const savedObjects = localStorage.getItem(STORAGE_KEY);
    const savedBackground = localStorage.getItem(BG_STORAGE_KEY) as BackgroundMode | null;

    storeState = {
      ...storeState,
      objects: savedObjects ? (JSON.parse(savedObjects) as DrawObject[]) : [],
      backgroundMode: savedBackground === "light" ? "light" : "dark",
      undoStack: [],
      redoStack: [],
    };

    emit();
  },
  setActiveTool: (tool) => {
    setState((state) => ({
      ...state,
      activeTool: tool,
      selectedObjectId: tool === "cursor" ? state.selectedObjectId : null,
    }));
  },
  toggleToolbar: () => {
    setState((state) => ({ ...state, toolbarOpen: !state.toolbarOpen }));
  },
  setSelectedObjectId: (id) => {
    setState((state) => ({ ...state, selectedObjectId: id }));
  },
  addObject: (object) => {
    setState((state) => {
      const next = pushUndoState(state);
      return {
        ...next,
        objects: [...next.objects, object],
        selectedObjectId: object.id,
      };
    });
  },
  updateObject: (id, updater, options) => {
    setState((state) => {
      const index = state.objects.findIndex((object) => object.id === id);
      if (index === -1) {
        return state;
      }

      const baseState = options?.skipHistory ? state : pushUndoState(state);
      const updatedObjects = baseState.objects.map((object) => (object.id === id ? updater(object) : object));
      return {
        ...baseState,
        objects: updatedObjects,
      };
    });
  },
  deleteObject: (id) => {
    setState((state) => {
      if (!state.objects.some((object) => object.id === id)) {
        return state;
      }

      const next = pushUndoState(state);
      return {
        ...next,
        objects: next.objects.filter((object) => object.id !== id),
        selectedObjectId: next.selectedObjectId === id ? null : next.selectedObjectId,
      };
    });
  },
  deleteSelectedObject: () => {
    setState((state) => {
      if (!state.selectedObjectId) {
        return state;
      }

      const next = pushUndoState(state);
      return {
        ...next,
        objects: next.objects.filter((object) => object.id !== next.selectedObjectId),
        selectedObjectId: null,
      };
    });
  },
  clearAll: () => {
    setState((state) => {
      if (!state.objects.length) {
        return state;
      }

      const next = pushUndoState(state);
      return {
        ...next,
        objects: [],
        selectedObjectId: null,
      };
    });
  },
  undo: () => {
    setState((state) => {
      const previous = state.undoStack[state.undoStack.length - 1];
      if (!previous) {
        return state;
      }

      return {
        ...state,
        objects: previous.objects,
        selectedObjectId: previous.selectedObjectId,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, snapshotFromState(state)],
      };
    });
  },
  redo: () => {
    setState((state) => {
      const next = state.redoStack[state.redoStack.length - 1];
      if (!next) {
        return state;
      }

      return {
        ...state,
        objects: next.objects,
        selectedObjectId: next.selectedObjectId,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, snapshotFromState(state)],
      };
    });
  },
  toggleBackgroundMode: () => {
    setState((state) => ({
      ...state,
      backgroundMode: state.backgroundMode === "dark" ? "light" : "dark",
    }));
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = (): Store => ({
  ...storeState,
  hydrate: store.hydrate,
  setActiveTool: store.setActiveTool,
  toggleToolbar: store.toggleToolbar,
  setSelectedObjectId: store.setSelectedObjectId,
  addObject: store.addObject,
  updateObject: store.updateObject,
  deleteObject: store.deleteObject,
  deleteSelectedObject: store.deleteSelectedObject,
  clearAll: store.clearAll,
  undo: store.undo,
  redo: store.redo,
  toggleBackgroundMode: store.toggleBackgroundMode,
});

export const useDrawingStore = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
