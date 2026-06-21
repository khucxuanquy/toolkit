/**
 * Generic BFS utilities for connected-component searches on an abstract graph.
 * Used by GridSystem for match detection and floating-cluster discovery.
 */

export function bfsConnected<T>(
  start: T,
  key: (n: T) => string,
  neighbors: (n: T) => T[],
  predicate: (n: T) => boolean,
): T[] {
  const visited = new Set<string>();
  const result: T[] = [];
  const queue: T[] = [start];

  while (queue.length) {
    const node = queue.shift()!;
    const k = key(node);
    if (visited.has(k)) continue;
    visited.add(k);
    if (!predicate(node)) continue;
    result.push(node);
    for (const n of neighbors(node)) {
      if (!visited.has(key(n))) queue.push(n);
    }
  }
  return result;
}

/** Returns all nodes in `all` that are not reachable from any of `seeds`. */
export function findUnreachable<T>(
  seeds: T[],
  all: T[],
  key: (n: T) => string,
  neighbors: (n: T) => T[],
): T[] {
  const reachable = new Set<string>(seeds.map(key));
  const queue = [...seeds];

  while (queue.length) {
    const node = queue.shift()!;
    for (const n of neighbors(node)) {
      const k = key(n);
      if (!reachable.has(k)) {
        reachable.add(k);
        queue.push(n);
      }
    }
  }
  return all.filter((n) => !reachable.has(key(n)));
}
