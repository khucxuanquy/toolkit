"use client";

import { create } from "zustand";

interface DashboardUIState {
  query: string;
  favoritesOnly: boolean;
  setQuery: (query: string) => void;
  setFavoritesOnly: (favoritesOnly: boolean) => void;
}

/** Ephemeral dashboard filter state shared between the navbar and the grid. */
export const useDashboardUI = create<DashboardUIState>((set) => ({
  query: "",
  favoritesOnly: false,
  setQuery: (query) => set({ query }),
  setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
}));
