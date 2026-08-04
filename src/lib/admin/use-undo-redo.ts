"use client";

import { useRef, useState } from "react";

/**
 * Generic undo/redo over a single snapshot-able state value. Rapid changes
 * (typing) are coalesced into one undo step via debounce — the same UX as
 * most text editors, where undo reverts a "burst" of typing at once rather
 * than one keystroke at a time. History is capped at 50 steps.
 */
export function useUndoRedo<T>(initial: T, debounceMs = 600) {
  const [present, setPresentState] = useState(initial);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const pendingBaseline = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set(updater: T | ((prev: T) => T)) {
    setPresentState((prev) => {
      const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
      if (pendingBaseline.current === null) pendingBaseline.current = prev;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const baseline = pendingBaseline.current;
        pendingBaseline.current = null;
        if (baseline !== null) {
          setPast((p) => [...p, baseline].slice(-50));
          setFuture([]);
        }
      }, debounceMs);
      return next;
    });
  }

  function undo() {
    if (past.length === 0) return;
    const prevState = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture([present, ...future]);
    setPresentState(prevState);
  }

  function redo() {
    if (future.length === 0) return;
    const nextState = future[0];
    setFuture(future.slice(1));
    setPast([...past, present]);
    setPresentState(nextState);
  }

  /** Replaces the present value without creating an undo step — for syncing
   * in server state (e.g. after a restore) rather than a user edit. */
  function reset(value: T) {
    if (timer.current) clearTimeout(timer.current);
    pendingBaseline.current = null;
    setPresentState(value);
    setPast([]);
    setFuture([]);
  }

  return { present, set, undo, redo, reset, canUndo: past.length > 0, canRedo: future.length > 0 };
}
