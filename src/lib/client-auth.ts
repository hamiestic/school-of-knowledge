// Client-side authentication helper
// Manages the session token in localStorage and attaches it to API requests

const TOKEN_KEY = "sok_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// Monkey-patch fetch to automatically attach the Authorization header
// to all same-origin API requests
let patched = false;

export function installFetchInterceptor(): void {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const originalFetch = window.fetch;
  window.fetch = function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Only attach token for same-origin requests
    let url: string;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    } else {
      url = String(input);
    }

    // Skip cross-origin requests
    const isSameOrigin =
      url.startsWith("/") ||
      url.startsWith(window.location.origin) ||
      url.startsWith(`http://${window.location.host}`) ||
      url.startsWith(`https://${window.location.host}`);

    const token = getToken();
    if (isSameOrigin && token) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      init.headers = headers;
    }

    return originalFetch(input, init);
  };
}
