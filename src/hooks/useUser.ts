import { useState, useEffect } from "react";

/**
 * Lightweight client-side user hook.
 * - Reads a global `window.__USER__` if present (SSR-friendly).
 * - Falls back to unauthenticated user.
 *
 * Shape:
 * { id?: string; isAdmin: boolean }
 */
export function useUser() {
  const [user, setUser] = useState<{ id?: string; isAdmin: boolean }>({ isAdmin: false });

  useEffect(() => {
    // Prefer injected global user (set by server-side rendering) for fast startup
    // e.g., window.__USER__ = { id: 'uuid', isAdmin: true }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalUser = (window as any).__USER__;
      if (globalUser) {
        setUser({ id: globalUser.id, isAdmin: !!globalUser.isAdmin });
        return;
      }

      // If no global user, keep default unauthenticated state.
      setUser({ isAdmin: false });
    } catch {
      setUser({ isAdmin: false });
    }
  }, []);

  return user;
}
