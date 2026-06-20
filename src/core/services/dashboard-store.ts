"use client";

import { create } from "zustand";

interface DashboardUIState {
  query: string;
  favoritesOnly: boolean;
  /** Active category filter, or null for "all categories". */
  category: string | null;
  setQuery: (query: string) => void;
  setFavoritesOnly: (favoritesOnly: boolean) => void;
  setCategory: (category: string | null) => void;
}

/** Ephemeral dashboard filter state shared between the navbar and the grid. */
export const useDashboardUI = create<DashboardUIState>((set) => ({
  query: "",
  favoritesOnly: false,
  category: null,
  setQuery: (query) => set({ query }),
  setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
  setCategory: (category) => set({ category }),
}));
