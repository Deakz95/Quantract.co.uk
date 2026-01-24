
export async function safeFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const requestId = res.headers.get("x-request-id") || undefined;
  let json: any = null;
  try { json = await res.json(); } catch {}
  if (!res.ok || (json && json.ok === false)) {
    const msg = json?.error?.message || json?.error || `Request failed (${res.status})`;
    const err = new Error(requestId ? `${msg} (requestId: ${requestId})` : msg);
    (err as any).requestId = requestId;
    throw err;
  }
  return (json?.data ?? json) as T;
}
