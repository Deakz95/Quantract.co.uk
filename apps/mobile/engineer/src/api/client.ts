import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "qt_app_token";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

let _onForceLogout: (() => void) | null = null;

/** Register a callback invoked when a rotate attempt fails (token expired). */
export function setForceLogoutHandler(handler: () => void) {
  _onForceLogout = handler;
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/**
 * Authenticated fetch wrapper.
 * - Attaches Bearer token from SecureStore
 * - On 401: attempts one rotate, retries, then force-logs out
 */
export async function apiFetch(
  path: string,
  opts: RequestInit = {},
): Promise<Response> {
  const normalPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE_URL}${normalPath}`;
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...opts, headers });

  if (res.status === 401 && token) {
    // Attempt rotate
    const rotateRes = await fetch(`${BASE_URL}/api/engineer/auth/rotate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
    }).catch(() => null);

    if (rotateRes && rotateRes.ok) {
      const data = await rotateRes.json();
      if (data?.token) {
        await setStoredToken(data.token);
        // Retry original request with new token
        headers["authorization"] = `Bearer ${data.token}`;
        return fetch(url, { ...opts, headers });
      }
    }

    // Rotate failed — force logout
    await clearStoredToken();
    _onForceLogout?.();
  }

  return res;
}

/**
 * Unauthenticated fetch (for health check, login).
 */
export async function apiPublicFetch(
  path: string,
  opts: RequestInit = {},
): Promise<Response> {
  const normalPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE_URL}${normalPath}`;
  return fetch(url, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.headers as Record<string, string>),
    },
  });
}
