// src/services/http.ts

import { secureFetch } from "@/lib/auth";

export const API_BASE = "https://api.modovisa.com";

export class HttpError extends Error {
  status: number;
  body?: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function parseJsonSafe(res: Response) {
  // 204 No Content or empty body → return null
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // If backend ever returns non-JSON (shouldn’t), return raw text
    return text;
  }
}

type HttpInit = RequestInit & { timeoutMs?: number };

/** Core client. Always uses secureFetch (auth, refresh, retry). */
export async function http<T = unknown>(path: string, init: HttpInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer =
    init.timeoutMs != null ? setTimeout(() => ctrl.abort("timeout"), init.timeoutMs) : null;

  try {
    const res = await secureFetch(`${API_BASE}${path}`, {
      ...init,
      // Ensure JSON by default; allow callers to override
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      credentials: "include",
      signal: ctrl.signal,
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw new HttpError(res.status, `HTTP ${res.status}`, data);
    }
    return data as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Convenience helpers */
export const httpGet = <T = unknown>(path: string, init?: Omit<HttpInit, "method" | "body">) =>
  http<T>(path, { ...init, method: "GET" });

export const httpPost = <T = unknown>(
  path: string,
  body?: unknown,
  init?: Omit<HttpInit, "method" | "body">
) =>
  http<T>(path, {
    ...init,
    method: "POST",
    body: body != null && typeof body !== "string" ? JSON.stringify(body) : (body as any),
  });

export const httpPut = <T = unknown>(
  path: string,
  body?: unknown,
  init?: Omit<HttpInit, "method" | "body">
) =>
  http<T>(path, {
    ...init,
    method: "PUT",
    body: body != null && typeof body !== "string" ? JSON.stringify(body) : (body as any),
  });

export const httpDelete = <T = unknown>(path: string, init?: Omit<HttpInit, "method">) =>
  http<T>(path, { ...init, method: "DELETE" });
