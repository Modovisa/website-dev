// src/hooks/useLiveSimStream.ts
import { useEffect, useState } from "react";

export type DemoStage = "cart" | "checkout" | "thank_you" | "view";

export interface SimPageFromAPI {
  title?: string | null;
  url?: string | null;
  stage?: DemoStage | null;
  time_spent_seconds?: number | null;
}

export interface SimVisitorFromAPI {
  id: string;
  is_new_visitor: boolean;
  location: string;
  referrer: string;
  device: string;
  browser: string;
  session_seconds: number;
  pages: SimPageFromAPI[];
  is_active: boolean;
  left_at_ts?: number | null;
}

export interface DemoPage {
  title: string;
  url: string;
  stage?: DemoStage;
}

export interface DemoVisitor {
  id: string;
  isNew: boolean;
  location: string;
  referrer: string;
  device: string;
  browser: string;
  pages: DemoPage[];
  currentPageIndex: number;
  sessionSeconds: number;
  perPageSeconds: number[];
  pageDurationTargets: number[]; // not used, but keeps type aligned
  active: boolean;
  leftAt?: number;
}

const formatPages = (pages: SimPageFromAPI[]): DemoPage[] =>
  (pages || []).map((p) => ({
    title: p.title || "(No title)",
    url: p.url || "#",
    stage: (p.stage as DemoStage | undefined) ?? "view",
  }));

const mapSimVisitor = (v: SimVisitorFromAPI): DemoVisitor => {
  const pages = formatPages(v.pages || []);
  const currentPageIndex =
    pages.length === 0
      ? 0
      : Math.min(pages.length - 1, Math.max(0, pages.length - 1));

  return {
    id: v.id,
    isNew: !!v.is_new_visitor,
    location: v.location || "Unknown",
    referrer: v.referrer || "Direct / None",
    device: v.device || "Unknown",
    browser: v.browser || "Unknown",
    pages,
    currentPageIndex,
    sessionSeconds: Number(v.session_seconds || 0),
    perPageSeconds: (v.pages || []).map((p) =>
      Number(p.time_spent_seconds || 0),
    ),
    pageDurationTargets: (v.pages || []).map(() => 0),
    active: !!v.is_active,
    leftAt: v.left_at_ts || undefined,
  };
};

type StreamPayload = {
  type?: string;
  visitors?: SimVisitorFromAPI[];
};

export const useLiveSimStream = () => {
  const [visitors, setVisitors] = useState<DemoVisitor[]>([]);
  const [connected, setConnected] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      // NOTE: hard-coded to prod API; adjust if you want dev toggle
      es = new EventSource("https://api.modovisa.com/live/sim/stream", {
        withCredentials: false,
      });

      es.onopen = () => {
        if (cancelled) return;
        setConnected(true);
      };

      es.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        setErrorCount((n) => n + 1);
        // browser will usually auto-reconnect EventSource
      };

      es.onmessage = (event) => {
        if (cancelled) return;
        if (!event.data) return;

        let parsed: StreamPayload;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }

        const rawVisitors = parsed.visitors || [];
        const mapped = rawVisitors.map(mapSimVisitor);

        // You probably want active first then recent, like real dashboard
        mapped.sort((a, b) => {
          if (a.active && !b.active) return -1;
          if (!a.active && b.active) return 1;
          return (b.sessionSeconds || 0) - (a.sessionSeconds || 0);
        });

        setVisitors(mapped);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (es) {
        es.close();
        es = null;
      }
    };
  }, []);

  const activeVisitors = visitors.filter((v) => v.active);
  const recentVisitors = visitors.filter((v) => !v.active);

  return {
    visitors,
    activeVisitors,
    recentVisitors,
    connected,
    errorCount,
  };
};
