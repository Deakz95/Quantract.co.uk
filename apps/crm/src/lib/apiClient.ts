export type ApiErrorPayload = {
  message?: string;
  error?: string;
  details?: unknown;
};

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload | string | null;
  url?: string;

  constructor(status: number, message: string, payload?: ApiErrorPayload | string | null, url?: string) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.url = url;
  }
}

export type ApiRequestOptions = RequestInit & {
  signal?: AbortSignal;
};

async function parseBody(response: Response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(input: RequestInfo, init?: ApiRequestOptions): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await parseBody(response);

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.error || payload?.message || response.statusText;
    throw new ApiError(response.status, message || "Request failed", payload, typeof input === "string" ? input : undefined);
  }

  return payload as T;
}

export function requireOk(payload: { ok: boolean; error?: string }, message = "Request failed") {
  if (!payload.ok) {
    throw new ApiError(400, payload.error || message, payload.error || null);
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof ApiError) {
    if (typeof error.payload === "string") return error.payload;
    if (error.payload && typeof error.payload === "object") {
      return error.payload.error || error.payload.message || error.message;
    }
    return error.message;
  }

  if (error instanceof Error) return error.message;

  return fallback;
}

export function createAbortController() {
  return new AbortController();
}
