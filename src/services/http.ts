// src/services/http.ts
import { secureFetch } from "@/lib/auth";

/** Resolve API base dynamically (prod/dev) */
function resolveApiBase(): string {
  // 1) Explicit override via localStorage (you already use this elsewhere)
  try {
    const env = localStorage.getItem("modovisa_api_env"); // "dev" | "prod"
    if (env === "dev") return "https://dev-api.modovisa.com";
    if (env === "prod") return "https://api.modovisa.com";
  } catch {}

  // 2) Heuristic from current host
  const host = (typeof window !== "undefined" && window.location?.hostname) || "";
  if (host.startsWith("dev.") || host.includes("-dev") || host.includes("localhost")) {
    return "https://dev-api.modovisa.com";
  }

  // 3) Default to prod
  return "https://api.modovisa.com";
}

export const API_BASE = resolveApiBase();

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
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type HttpInit = RequestInit & { timeoutMs?: number };

/** Core client. Always uses secureFetch (auth, refresh, retry). */
export async function http<T = unknown>(path: string, init: HttpInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = init.timeoutMs != null ? setTimeout(() => ctrl.abort("timeout"), init.timeoutMs) : null;

  try {
    const res = await secureFetch(`${API_BASE}${path}`, {
      ...init,
      // Don’t force JSON header on GET; avoid unnecessary preflights.
      headers: {
        ...(init.method && init.method !== "GET" ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
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
