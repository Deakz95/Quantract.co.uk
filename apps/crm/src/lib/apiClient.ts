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

// Map API error codes to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication
  unauthenticated: "Please sign in to continue",
  forbidden: "You don't have permission to perform this action",
  no_company: "No company associated with your account",

  // Database/Server errors
  service_unavailable: "Service temporarily unavailable. Please try again later.",
  database_error: "A database error occurred. Please try again.",
  load_failed: "Failed to load data. Please refresh the page.",
  create_failed: "Failed to create. Please try again.",
  update_failed: "Failed to save changes. Please try again.",
  delete_failed: "Failed to delete. Please try again.",

  // Validation errors
  title_required: "Title is required",
  name_required: "Name is required",
  email_required: "Email is required",
  first_name_and_last_name_required: "First name and last name are required",
  stage_id_required: "Please select a stage",
  missing_stage_id: "Please select a stage",
  invalid_stage: "Invalid stage selected",
  invalid_contact: "Invalid contact selected",
  invalid_client: "Invalid client selected",
  invalid_owner: "Invalid owner selected",
  email_already_exists: "This email address is already in use",
  name_already_exists: "This name is already in use",

  // Not found
  not_found: "The requested item was not found",
  client_not_found: "Client not found",
  contact_not_found: "Contact not found",

  // Business logic
  cannot_delete_stage_with_deals: "Cannot delete a stage that contains deals. Move or delete the deals first.",
  invalid_stage_id: "One or more stage IDs are invalid",
};

function translateErrorCode(errorCode: string): string {
  // Check for exact match
  if (ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  // Check for partial matches (e.g., "P2002" Prisma error codes)
  if (errorCode.startsWith("P")) {
    return "A database error occurred. Please try again.";
  }

  // Return original if no translation found, but clean it up
  return errorCode.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof ApiError) {
    if (typeof error.payload === "string") {
      return translateErrorCode(error.payload);
    }
    if (error.payload && typeof error.payload === "object") {
      const errorCode = error.payload.error || error.payload.message || error.message;
      return translateErrorCode(errorCode);
    }
    return translateErrorCode(error.message);
  }

  if (error instanceof Error) {
    // Check if error message looks like a Prisma error
    if (error.message.includes("prisma.") || error.message.includes("findMany") || error.message.includes("findFirst")) {
      return "A database error occurred. Please try again.";
    }
    return error.message;
  }

  return fallback;
}

export function createAbortController() {
  return new AbortController();
}
