// src/lib/mvBus.ts
type Handler<T = any> = (payload: T) => void;

class MVBus {
  private map = new Map<string, Set<Handler>>();

  on<T = any>(type: string, fn: Handler<T>) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type)!.add(fn as Handler);
    return () => this.off(type, fn);
  }

  off<T = any>(type: string, fn: Handler<T>) {
    const s = this.map.get(type);
    if (!s) return;
    s.delete(fn as Handler);
    if (s.size === 0) this.map.delete(type);
  }

  emit<T = any>(type: string, payload: T) {
    const s = this.map.get(type);
    if (!s) return;
    for (const fn of s) {
      try { (fn as Handler<T>)(payload); } catch {}
    }
  }
}

export const mvBus = new MVBus();

/**
 * Events:
 * - "mv:dashboard:snapshot" => DashboardPayload
 * - "mv:dashboard:frame"    => DashboardPayload (partial)
 * - "mv:live:cities"        => { points: GeoCityPoint[], total: number }
 * - "mv:live:count"         => { count: number }
 * - "mv:site:changed"       => { siteId: number }
 * - "mv:error"              => { message: string }
 */
