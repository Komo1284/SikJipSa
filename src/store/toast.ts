import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastStore = {
  toasts: Toast[];
  show: (message: string, kind?: ToastKind, durationMs?: number) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  show(message, kind = 'info', durationMs = 5000) {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => get().dismiss(id), durationMs);
  },

  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Convenience helpers for non-React code (stores, repos). */
export const toast = {
  info: (m: string, ms?: number) => useToastStore.getState().show(m, 'info', ms),
  success: (m: string, ms?: number) => useToastStore.getState().show(m, 'success', ms),
  error: (m: string, ms?: number) => useToastStore.getState().show(m, 'error', ms ?? 6500),
};
