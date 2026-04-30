import { create } from 'zustand';

type UIState = {
  spaceFilter: string; // 'all' | location id
  query: string;
  setSpaceFilter: (s: string) => void;
  setQuery: (q: string) => void;
};

/**
 * Shared UI state used by the desktop shell — the sidebar writes to `spaceFilter`,
 * the main area (list/home) reads from it. On mobile, each screen keeps its own
 * local state, so this store mostly matters for the web sidebar ↔ content sync.
 */
export const useUIStore = create<UIState>((set) => ({
  spaceFilter: 'all',
  query: '',
  setSpaceFilter: (spaceFilter) => set({ spaceFilter }),
  setQuery: (query) => set({ query }),
}));
