// src/hooks/useTrackingScriptToken.ts

import { useEffect, useState } from "react";
import { apiBase } from "@/lib/api";
import { secureFetch } from "@/lib/auth/auth";

const API = apiBase();

type TrackingWebsite = {
  id: number;
  domain: string;
  website_name: string;
  timezone: string | null;
};

type UseTrackingScriptTokenResult = {
  trackingToken: string;
  loading: boolean;
  error: string | null;
};

export function useTrackingScriptToken(): UseTrackingScriptTokenResult {
  const [trackingToken, setTrackingToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadToken = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Load tracking websites for the current user (if logged in)
        const res = await secureFetch(`${API}/api/tracking-websites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (res.status === 401 || !res.ok) {
          // Not logged in or some error – just bail, keep empty token
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        const json = await res.json();
        const list: TrackingWebsite[] = Array.isArray(json.projects)
          ? json.projects
          : [];

        if (!list.length) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        // 2) Decide which domain to use
        let domain = list[0].domain;
        try {
          const saved = window.localStorage.getItem("active_website_domain");
          if (saved) {
            const match = list.find((w) => w.domain === saved);
            if (match) domain = match.domain;
          }
        } catch {
          // ignore localStorage issues
        }

        // 3) Fetch tracking token for that domain
        const tokenRes = await secureFetch(`${API}/api/tracking-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });

        if (!tokenRes.ok) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        const tokenJson = await tokenRes.json();
        const token = tokenJson?.tracking_token || "";

        if (!cancelled) {
          setTrackingToken(token || "");
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to resolve tracking token");
          setLoading(false);
        }
      }
    };

    loadToken();

    return () => {
      cancelled = true;
    };
  }, []);

  return { trackingToken, loading, error };
}
