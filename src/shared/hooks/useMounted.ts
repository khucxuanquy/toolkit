"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns true only after the component has mounted on the client.
 *
 * Implemented with `useSyncExternalStore` (rather than `useState` + `useEffect`)
 * so it is hydration-safe and doesn't trigger a synchronous setState in an
 * effect. The server snapshot is always `false`; the client snapshot is `true`.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
