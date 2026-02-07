import { create } from 'zustand';

interface UIState {
  // Sidebar
  isSidebarCollapsed: boolean;

  // MCP Panel
  isMCPPanelOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  toggleMCPPanel: () => void;
  setMCPPanelOpen: (open: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  isSidebarCollapsed: false,
  isMCPPanelOpen: false,
};

export const useUiStore = create<UIState>((set) => ({
  ...initialState,

  // Sidebar
  toggleSidebar: () => {
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed) => {
    set({ isSidebarCollapsed: collapsed });
  },

  // MCP Panel
  toggleMCPPanel: () => {
    set((state) => ({ isMCPPanelOpen: !state.isMCPPanelOpen }));
  },

  setMCPPanelOpen: (open) => {
    set({ isMCPPanelOpen: open });
  },

  // Reset
  reset: () => {
    set(initialState);
  },
}));
