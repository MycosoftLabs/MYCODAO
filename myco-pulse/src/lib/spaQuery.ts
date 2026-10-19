import { useEffect, useState } from "react";

/**
 * URL query state for the Blocks SPA. `history.pushState` does not fire `popstate`, so every
 * write dispatches QUERY_CHANGE_EVENT and readers subscribe to both.
 */

export const QUERY_CHANGE_EVENT = "mycodao:querychange";

export function readQuery(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function writeQuery(
  updates: Record<string, string | null | undefined>,
  mode: "push" | "replace" = "replace",
  state?: Record<string, unknown>,
): void {
  const url = new URL(window.location.href);
  let changed = false;
  for (const [key, value] of Object.entries(updates)) {
    const current = url.searchParams.get(key);
    if (value) {
      if (current !== value) {
        url.searchParams.set(key, value);
        changed = true;
      }
    } else if (current !== null) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed && mode === "replace") return;
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (mode === "push") window.history.pushState(state ?? {}, "", next);
  else window.history.replaceState(window.history.state, "", next);
  window.dispatchEvent(new Event(QUERY_CHANGE_EVENT));
}

/** Remove every query key that starts with `prefix` (e.g. per-tab filter params). */
export function clearQueryPrefix(prefix: string): void {
  const keys = Array.from(new URLSearchParams(window.location.search).keys()).filter((k) => k.startsWith(prefix));
  if (keys.length) writeQuery(Object.fromEntries(keys.map((k) => [k, null])));
}

export function subscribeQuery(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(QUERY_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(QUERY_CHANGE_EVENT, onChange);
  };
}

export function useQueryParam(key: string): string | null {
  const [value, setValue] = useState<string | null>(() => readQuery(key));
  useEffect(() => {
    const sync = () => setValue(readQuery(key));
    sync();
    return subscribeQuery(sync);
  }, [key]);
  return value;
}
