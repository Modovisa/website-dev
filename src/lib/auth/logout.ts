// src/lib/auth/logout.ts
const API = "https://api.modovisa.com";

export type LogoutAudience = "user" | "admin";

async function serverLogout(aud: LogoutAudience, source = "menu") {
  const url = `${API}/api/logout?aud=${encodeURIComponent(
    aud,
  )}&src=${encodeURIComponent(source)}`;

  try {
    await fetch(url, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      cache: "no-store",
    });
  } catch (e) {
    console.warn(
      `[logout:${aud}] server logout failed, continuing client cleanup:`,
      e,
    );
  }
}

function clearUiCaches() {
  try {
    localStorage.removeItem("username");
  } catch {}
  try {
    localStorage.removeItem("active_website_domain");
  } catch {}
  try {
    localStorage.removeItem("tracking_token");
  } catch {}
  try {
    localStorage.removeItem("mv_last_google_email");
  } catch {}
  try {
    sessionStorage.clear();
  } catch {}
  try {
    (window as any).__mvAccess = null;
  } catch {}

  // Kill any legacy global WS / timers
  try {
    const w: any = window as any;
    if (w.ws && typeof w.ws.close === "function") w.ws.close();
  } catch {}
  try {
    const w: any = window as any;
    if (w._mvBucketTimer) clearInterval(w._mvBucketTimer);
  } catch {}
}

async function googlePostLogoutCleanup() {
  try {
    const w: any = window as any;
    const gsi = w.google?.accounts?.id;
    if (!gsi) return;

    const email = localStorage.getItem("mv_last_google_email");

    if (email && typeof gsi.revoke === "function") {
      gsi.revoke(email, () => {
        console.log("[logout] revoked Google access for", email);
        if (typeof gsi.disableAutoSelect === "function") {
          try {
            gsi.disableAutoSelect();
          } catch (err) {
            console.warn(
              "[logout] disableAutoSelect after revoke failed:",
              err,
            );
          }
        }
      });
    } else if (typeof gsi.disableAutoSelect === "function") {
      gsi.disableAutoSelect();
    }
  } catch (err) {
    console.warn("[logout] Google revoke/disableAutoSelect failed:", err);
  }
}

export async function fullLogout(
  aud: LogoutAudience,
  opts?: { redirectTo?: string; source?: string },
) {
  const redirectTo =
    opts?.redirectTo ?? (aud === "admin" ? "/admin/login" : "/login");
  const source = opts?.source ?? "menu";

  await serverLogout(aud, source);
  clearUiCaches();
  await googlePostLogoutCleanup();

  try {
    new BroadcastChannel("mv-auth").postMessage({ type: "logout", aud });
  } catch {}

  window.location.replace(redirectTo);
}
