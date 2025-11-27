/**
 * UI State Store - управление глобальным состоянием UI
 * Используется для координации видимости элементов интерфейса
 */
import { create } from 'zustand';

interface UIState {
  // Открытые формы/диалоги
  openDialogs: Set<string>;

  // Методы управления диалогами
  registerDialog: (id: string) => void;
  unregisterDialog: (id: string) => void;
  hasOpenDialogs: () => boolean;

  // Состояние плеера
  isPlayerExpanded: boolean;
  setPlayerExpanded: (expanded: boolean) => void;

  // Вычисляемое свойство: должна ли быть скрыта FAB кнопка
  shouldHideFAB: () => boolean;
}

export const useUIStateStore = create<UIState>((set, get) => ({
  openDialogs: new Set<string>(),

  registerDialog: (id: string) => {
    set((state) => {
      const newDialogs = new Set(state.openDialogs);
      newDialogs.add(id);
      return { openDialogs: newDialogs };
    });
  },

  unregisterDialog: (id: string) => {
    set((state) => {
      const newDialogs = new Set(state.openDialogs);
      newDialogs.delete(id);
      return { openDialogs: newDialogs };
    });
  },

  hasOpenDialogs: () => {
    return get().openDialogs.size > 0;
  },

  isPlayerExpanded: false,

  setPlayerExpanded: (expanded: boolean) => {
    set({ isPlayerExpanded: expanded });
  },

  shouldHideFAB: () => {
    const state = get();
    return state.isPlayerExpanded || state.hasOpenDialogs();
  },
}));

// Селекторы для оптимизации ре-рендеров
export const useIsPlayerExpanded = () => useUIStateStore((state) => state.isPlayerExpanded);

// ✅ FIX: Derive computed values inline instead of calling functions
// This prevents unnecessary re-renders and potential infinite loops
export const useShouldHideFAB = () => useUIStateStore((state) =>
  state.isPlayerExpanded || state.openDialogs.size > 0
);

export const useHasOpenDialogs = () => useUIStateStore((state) =>
  state.openDialogs.size > 0
);
