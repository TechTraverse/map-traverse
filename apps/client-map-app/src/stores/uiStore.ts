import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activePanel: 'layers' | 'legend' | 'basemaps' | null;
  isLoading: boolean;
  toggleSidebar: () => void;
  setActivePanel: (panel: UIState['activePanel']) => void;
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activePanel: null,
  isLoading: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
