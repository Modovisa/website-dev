// src/services/liveSimulation.store.ts

export type LiveSimPage = {
  url: string;
  title: string;
};

export type LiveSimVisitor = {
  id: string;
  city: string;
  country: string;
  ref?: string;
  device?: string;
  browser?: string;
  duration?: number;
  active: boolean;
  new?: boolean;
  startedAt?: number;
  leftAt?: number;
  currentPage?: number;
  journey: LiveSimPage[];
  perPageDurations?: number[];
};

export type LiveSimState = {
  visitors: LiveSimVisitor[];
  selectedId: string | null;
};

type Listener = (state: LiveSimState) => void;

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
  "https://api.modovisa.com";

let state: LiveSimState = {
  visitors: [],
  selectedId: null,
};

let listeners = new Set<Listener>();
let source: EventSource | null = null;
let started = false;

function emit() {
  const snapshot = state;
  listeners.forEach((fn) => fn(snapshot));
}

function ensureEventSource() {
  if (started) return;
  started = true;

  const url = `${API_BASE}/live/sim/stream`;
  source = new EventSource(url);

  // 🔴 IMPORTANT: listen for the named "snapshot" event (not "message")
  source.addEventListener("snapshot", (raw: Event) => {
    try {
      const e = raw as MessageEvent;
      const payload = JSON.parse(e.data || "{}");
      const incoming: LiveSimVisitor[] = Array.isArray(payload.activeVisitors)
        ? payload.activeVisitors
        : [];

      state.visitors = incoming;

      const prev = state.selectedId;
      const selected =
        state.visitors.find((v) => v.id === prev) || state.visitors[0] || null;

      state.selectedId = selected ? selected.id : null;

      emit();

      // one-time debug, mirroring the Bootstrap version
      if (!(window as any).__loggedSSEOnce) {
        console.log("SSE snapshot received", {
          count: state.visitors.length,
        });
        (window as any).__loggedSSEOnce = true;
      }
    } catch (err) {
      console.error("LiveSim SSE parse error", err);
    }
  });

  source.onerror = () => {
    console.warn("LiveSim SSE error – browser will auto-retry");
  };
}

/**
 * Subscribe to live simulation snapshots.
 * - Ensures SSE is started
 * - Immediately calls listener with current state
 * - Returns an unsubscribe fn
 */
export function subscribeLiveSimulation(listener: Listener) {
  listeners.add(listener);
  ensureEventSource();
  // send current snapshot immediately
  listener(state);

  return () => {
    listeners.delete(listener);
    // we do NOT close the EventSource here – keep it global so multiple
    // components (home, docs, etc.) share the same stream
  };
}

export function getLiveSimulationState(): LiveSimState {
  return state;
}

export function setSelectedVisitor(id: string | null) {
  state.selectedId = id;
  emit();
}
