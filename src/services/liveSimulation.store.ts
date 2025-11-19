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

// 🔑 single source of truth (internal)
// we will ALWAYS replace this with a new object on updates
let state: LiveSimState = {
  visitors: [],
  selectedId: null,
};

let listeners = new Set<Listener>();
let source: EventSource | null = null;
let started = false;

/**
 * Create an immutable snapshot for consumers.
 * This ensures React's useState always sees fresh references.
 */
function makeSnapshot(): LiveSimState {
  return {
    visitors: [...state.visitors],
    selectedId: state.selectedId,
  };
}

function emit() {
  const snapshot = makeSnapshot();
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

      // compute next selectedId based on previous selection
      const prevSelectedId = state.selectedId;
      const selectedVisitor =
        incoming.find((v) => v.id === prevSelectedId) ||
        incoming[0] ||
        null;

      const nextSelectedId = selectedVisitor ? selectedVisitor.id : null;

      // 🔁 REPLACE state object instead of mutating it
      state = {
        visitors: incoming,
        selectedId: nextSelectedId,
      };

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
 * - Immediately calls listener with current snapshot
 * - Returns an unsubscribe fn
 */
export function subscribeLiveSimulation(listener: Listener) {
  listeners.add(listener);
  ensureEventSource();

  // send current snapshot immediately
  listener(makeSnapshot());

  return () => {
    listeners.delete(listener);
    // we do NOT close the EventSource here – keep it global so multiple
    // components (home, docs, etc.) share the same stream
  };
}

export function getLiveSimulationState(): LiveSimState {
  return makeSnapshot();
}

/**
 * Imperatively select a visitor in the global store.
 * Not used on the homepage demo (we keep local selection there),
 * but used by other views that want store-driven selection.
 */
export function setSelectedVisitor(id: string | null) {
  // REPLACE state object immutably
  state = {
    ...state,
    selectedId: id,
  };
  emit();
}
