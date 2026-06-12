import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  /** '되돌리기' / '다시 시도' 같은 한 개짜리 액션 버튼. */
  action?: ToastAction;
};

type ToastStore = {
  toasts: Toast[];
  show: (message: string, kind?: ToastKind, durationMs?: number, action?: ToastAction) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

/** 동시에 띄우는 토스트 상한 — 넘치면 가장 오래된 것부터 밀어낸다. */
const MAX_TOASTS = 3;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  show(message, kind = 'info', durationMs = 5000, action) {
    // 같은 메시지가 이미 떠 있으면 새로 쌓지 않는다 — 연속 실패 시
    // 동일 에러 토스트가 화면을 도배하던 것 방지.
    const dup = get().toasts.find((t) => t.message === message && t.kind === kind);
    if (dup) return;

    const id = nextId++;
    set((s) => {
      const next = [...s.toasts, { id, kind, message, action }];
      return { toasts: next.slice(-MAX_TOASTS) };
    });
    setTimeout(() => get().dismiss(id), durationMs);
  },

  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Convenience helpers for non-React code (stores, repos). */
export const toast = {
  info: (m: string, ms?: number, action?: ToastAction) =>
    useToastStore.getState().show(m, 'info', ms, action),
  success: (m: string, ms?: number, action?: ToastAction) =>
    useToastStore.getState().show(m, 'success', ms, action),
  // 에러는 행동이 필요한 정보라 조금 더 오래 보여준다. action 이 있으면
  // 누를 시간을 더 준다.
  error: (m: string, ms?: number, action?: ToastAction) =>
    useToastStore.getState().show(m, 'error', ms ?? (action ? 9000 : 6500), action),
};
