/**
 * バナーエディター ステート管理
 * Zustandベースのエディター状態管理
 */

import { create } from "zustand";
import {
  TextLayer,
  createTextLayer,
  duplicateTextLayer,
  updateTextLayer,
  moveLayerUp,
  moveLayerDown,
} from "./text-layer";

// =============================================================================
// 型定義
// =============================================================================

export interface ExportOptions {
  format: "png" | "jpeg";
  quality?: number; // JPEG品質（0-100）
  width?: number; // リサイズ幅
  height?: number; // リサイズ高さ
  scale?: number; // 拡大率
}

export interface BannerEditorState {
  // キャンバス設定
  backgroundImage: string | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;

  // レイヤー管理
  layers: TextLayer[];
  selectedLayerId: string | null;

  // 編集モード
  isEditing: boolean;
  editingLayerId: string | null;

  // ドラッグ状態
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;

  // 履歴（Undo/Redo用）
  history: TextLayer[][];
  historyIndex: number;

  // アクション
  setBackgroundImage: (image: string | null) => void;
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;

  addLayer: (overrides?: Partial<TextLayer>) => string;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<TextLayer>) => void;
  selectLayer: (id: string | null) => void;
  moveLayer: (id: string, direction: "up" | "down") => void;

  setEditing: (isEditing: boolean, layerId?: string | null) => void;
  setDragging: (isDragging: boolean, startX?: number, startY?: number) => void;

  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  reset: () => void;
}

// =============================================================================
// 初期状態
// =============================================================================

const initialState = {
  backgroundImage: null,
  canvasWidth: 1280,
  canvasHeight: 720,
  zoom: 1,
  layers: [],
  selectedLayerId: null,
  isEditing: false,
  editingLayerId: null,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  history: [],
  historyIndex: -1,
};

// =============================================================================
// ストア
// =============================================================================

export const useBannerEditorStore = create<BannerEditorState>((set, get) => ({
  ...initialState,

  // ========== キャンバス設定 ==========

  setBackgroundImage: (image) => {
    set({ backgroundImage: image });
  },

  setCanvasSize: (width, height) => {
    set({ canvasWidth: width, canvasHeight: height });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(3, zoom)) });
  },

  // ========== レイヤー管理 ==========

  addLayer: (overrides) => {
    const state = get();
    const newLayer = createTextLayer({
      x: state.canvasWidth / 2,
      y: state.canvasHeight / 2,
      ...overrides,
    });

    set((s) => ({
      layers: [...s.layers, newLayer],
      selectedLayerId: newLayer.id,
    }));

    get().saveToHistory();
    return newLayer.id;
  },

  removeLayer: (id) => {
    set((state) => {
      const newLayers = state.layers.filter((l) => l.id !== id);
      const newSelectedId =
        state.selectedLayerId === id
          ? newLayers.length > 0
            ? newLayers[newLayers.length - 1].id
            : null
          : state.selectedLayerId;

      return {
        layers: newLayers,
        selectedLayerId: newSelectedId,
        editingLayerId:
          state.editingLayerId === id ? null : state.editingLayerId,
        isEditing: state.editingLayerId === id ? false : state.isEditing,
      };
    });

    get().saveToHistory();
  },

  duplicateLayer: (id) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === id);
    if (!layer) return;

    const newLayer = duplicateTextLayer(layer);
    set((s) => ({
      layers: [...s.layers, newLayer],
      selectedLayerId: newLayer.id,
    }));

    get().saveToHistory();
  },

  updateLayer: (id, updates) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? updateTextLayer(layer, updates) : layer
      ),
    }));
  },

  selectLayer: (id) => {
    set({ selectedLayerId: id });
  },

  moveLayer: (id, direction) => {
    set((state) => ({
      layers:
        direction === "up"
          ? moveLayerUp(state.layers, id)
          : moveLayerDown(state.layers, id),
    }));

    get().saveToHistory();
  },

  // ========== 編集モード ==========

  setEditing: (isEditing, layerId = null) => {
    set({
      isEditing,
      editingLayerId: isEditing ? layerId : null,
    });
  },

  setDragging: (isDragging, startX = 0, startY = 0) => {
    set({
      isDragging,
      dragStartX: startX,
      dragStartY: startY,
    });
  },

  // ========== 履歴管理 ==========

  saveToHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.layers)));

      // 履歴は最大50件まで
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state;

      const newIndex = state.historyIndex - 1;
      return {
        layers: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;

      const newIndex = state.historyIndex + 1;
      return {
        layers: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
      };
    });
  },

  // ========== リセット ==========

  reset: () => {
    set(initialState);
  },
}));

// =============================================================================
// セレクター
// =============================================================================

export const selectSelectedLayer = (state: BannerEditorState) =>
  state.layers.find((l) => l.id === state.selectedLayerId) || null;

export const selectVisibleLayers = (state: BannerEditorState) =>
  state.layers.filter((l) => l.visible);

export const selectCanUndo = (state: BannerEditorState) =>
  state.historyIndex > 0;

export const selectCanRedo = (state: BannerEditorState) =>
  state.historyIndex < state.history.length - 1;
