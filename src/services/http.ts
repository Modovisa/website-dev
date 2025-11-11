// src/services/http.ts

const API_BASE = "https://api.modovisa.com";

export class HttpError extends Error {
  status: number;
  body?: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function toJson(res: Response) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

export async function http(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const ctrl = new AbortController();
  const t = init.timeoutMs
    ? setTimeout(() => ctrl.abort("timeout"), init.timeoutMs)
    : null;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      signal: ctrl.signal,
      ...init,
    });
    const data = await toJson(res);
    if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status}`, data);
    return data;
  } finally {
    if (t) clearTimeout(t);
  }
}
