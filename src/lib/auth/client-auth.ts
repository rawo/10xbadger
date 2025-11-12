/**
 * Client-side authentication utilities
 *
 * These utilities help React components access authentication state
 * that was set on the server and passed via window.__AUTH_STATE__
 */

declare global {
  interface Window {
    __AUTH_STATE__?: {
      isAuthenticated: boolean;
    };
  }
}

/**
 * Check if user is authenticated on the client side
 * Uses the auth state set by the server in Layout.astro
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.__AUTH_STATE__?.isAuthenticated ?? false;
}

/**
 * Navigate to logout
 * This function handles the logout flow by navigating to /logout
 * which will clear the session server-side
 */
export function logout(): void {
  window.location.href = "/logout";
}

/**
 * Navigate to login with optional redirect
 */
export function goToLogin(redirectUrl?: string): void {
  const url = redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login";
  window.location.href = url;
}
