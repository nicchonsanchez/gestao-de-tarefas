'use client';

import { create } from 'zustand';

interface ConflictPayload {
  active: {
    id: string;
    cardId: string;
    cardTitle: string;
    boardName: string;
    startedAt: string;
  };
  target: {
    cardId: string;
    cardTitle?: string;
    note?: string | null;
  };
  onResolved?: () => void;
}

interface TimerStoreState {
  conflict: ConflictPayload | null;
  openConflict: (payload: ConflictPayload) => void;
  closeConflict: () => void;
}

export const useTimerStore = create<TimerStoreState>((set) => ({
  conflict: null,
  openConflict: (payload) => set({ conflict: payload }),
  closeConflict: () => set({ conflict: null }),
}));
