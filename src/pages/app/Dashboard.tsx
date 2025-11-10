import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { secureFetch } from "@/lib/auth";

// ---- helper: sequential script loader ----
function loadScript(src: string, attrs: Record<string, string> = {}) {
  return new Promise<void>((resolve, reject) => {
    // avoid double-loading
    const existing = document.querySelector<HTMLScriptElement>(`script[data-src="${src}"]`);
    if (existing) {
      if ((existing as any)._loaded) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed: ${src}`)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.defer = true;
    s.dataset.src = src;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.addEventListener("load", () => {
      (s as any)._loaded = true;
      resolve();
    });
    s.addEventListener("error", () => reject(new Error(`Failed: ${src}`)));
    document.body.appendChild(s);
  });
}

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
  const [booted, setBooted] = useState(false);

  // ⚠️ This page renders the exact DOM your user-dashboard.js expects (ids, structure).
  // We then inject the vendor libs + your script and dispatch a synthetic DOMContentLoaded.

  useEffect(() => {
    if (!isAuthenticated || booted) return;

    (async () => {
      try {
        // 1) echarts (needed for map/heatmap/lines)
        await loadScript("/assets/vendor/libs/echarts/echarts.min.js");

        // 2) chart.js core + funnel plugin
        await loadScript("/assets/vendor/libs/chartjs/chartjs.js");
        await loadScript("/assets/vendor/libs/chartjs/chartjs-chart-funnel.js");

        // 3) your dashboard runtime (expects DOM to be present)
        await loadScript("/assets/js/user-dashboard.js");

        // 4) fire a synthetic DOMContentLoaded so the init inside user-dashboard.js runs now
        document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));

        setBooted(true);
      } catch (e) {
        console.error("Dashboard boot error:", e);
      }
    })();
  }, [isAuthenticated, booted]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="animate-pulse text-muted-foreground">Checking authentication…</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      {/* we keep your Bootstrap-like DOM and ids intact so user-dashboard.js can target them */}
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* ============================ */}
        {/* Combined Selector: Website + Time Range */}
        {/* ============================ */}
        <div className="row">
          <div className="col-sm-6 col-lg-2 mb-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <h6 className="d-flex align-items-center gap-2 mb-3">
                  View Website
                  <i className="bx bx-info-circle" data-bs-toggle="tooltip" title="Switch between your websites to see individual analytics."></i>
                </h6>

                <div className="dropdown mb-3" id="websiteDropdownContainer">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary dropdown-toggle py-2 w-100"
                    id="websiteDropdownBtn"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    Choose Website
                  </button>
                  <ul className="dropdown-menu w-100" id="websiteDropdownMenu" aria-labelledby="websiteDropdownBtn">
                    <li><span className="dropdown-item disabled">Loading...</span></li>
                  </ul>
                </div>

                <h6 className="d-flex align-items-center gap-2 mb-2 mt-4">
                  Time Range
                  <i className="bx bx-info-circle" data-bs-toggle="tooltip" title="Choose the time range for dashboard metrics."></i>
                </h6>
                <select id="rangeSelector" className="form-select" defaultValue="24h">
                  <option value="24h">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="12mo">Last 12 Months</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Visitors */}
          <div className="col-sm-6 col-lg-2 mb-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <h6 className="d-flex align-items-center gap-2 mb-3">
                  Live Visitors
                  <i className="bx bx-info-circle" data-bs-toggle="tooltip" title="Number of users currently active on your site in real time."></i>
                </h6>
                <h3>
                  <span id="liveVisitorsCount">--</span>
                  <span className="change-badge text-success small ms-2" id="liveVisitorsCount-change"></span>
                </h3>
                <div className="dashboard-placeholder d-none">
                  <ul className="list-unstyled mb-0">
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-10" /></li>
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-8" /></li>
                    <li className="placeholder-glow"><span className="placeholder placeholder-xs col-6" /></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Total Visitors */}
          <div className="col-sm-6 col-lg-2 mb-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <h6 className="d-flex align-items-center gap-2 mb-3">
                  Total Visitors
                  <i className="bx bx-info-circle" data-bs-toggle="tooltip" title="Unique users who visited during the selected time range."></i>
                </h6>
                <h3 id="totalVisitors">--</h3>
                <div className="dashboard-placeholder d-none">
                  <ul className="list-unstyled mb-0">
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-10" /></li>
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-8" /></li>
                    <li className="placeholder-glow"><span className="placeholder placeholder-xs col-6" /></li>
                  </ul>
                </div>
                <div id="totalVisitors-change" className="text-center mt-1"></div>
              </div>
            </div>
          </div>

          {/* Bounce Rate */}
          <div className="col-sm-6 col-lg-2 mb-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <h6 className="d-flex align-items-center gap-2 mb-3">
                  Bounce Rate
                  <i className="bx bx-info-circle" data-bs-toggle="tooltip" title="Percentage of visitors who left after viewing only one page. Lower is better."></i>
                </h6>
                <h3 id="bounceRate">--%</h3>
                <div className="dashboard-placeholder d-none">
                  <ul className="list-unstyled mb-0">
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-10" /></li>
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-8" /></li>
                    <li className="placeholder-glow"><span className="placeholder placeholder-xs col-6" /></li>
                  </ul>
                </div>
                <span id="bounceRate-change" className="text-center mt-1"></span>
              </div>
            </div>
          </div>

          {/* Multi-Page Visits */}
          <div className="col-sm-6 col-lg-2 mb-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <h6 className="d-flex align-items-center gap-2 mb-3">
                  Multi-Page Visits
                  <i className="bx bx-info-circle" data-bs-toggle="tooltip" title="Sessions with more than one page viewed. Indicates deeper user engagement."></i>
                </h6>
                <h3 id="multiPageVisits">--</h3>
                <div className="dashboard-placeholder d-none">
                  <ul className="list-unstyled mb-0">
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-10" /></li>
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-8" /></li>
                    <li className="placeholder-glow"><span className="placeholder placeholder-xs col-6" /></li>
                  </ul>
                </div>
                <span className="change-badge small ms-2" id="multiPageVisits-change"></span>
              </div>
            </div>
          </div>

          {/* Avg Duration */}
          <div className="col-sm-6 col-lg-2 mb-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <h6 className="d-flex align-items-center gap-2 mb-3">
                  Avg Duration
                  <i className="bx bx-info-circle" data-bs-toggle="tooltip" title="Average time users spent on your site during a session."></i>
                </h6>
                <h3 id="avgDuration">--</h3>
                <div className="dashboard-placeholder d-none">
                  <ul className="list-unstyled mb-0">
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-10" /></li>
                    <li className="placeholder-glow mb-2"><span className="placeholder placeholder-xs col-8" /></li>
                    <li className="placeholder-glow"><span className="placeholder placeholder-xs col-6" /></li>
                  </ul>
                </div>
                <span id="avgDuration-change" className="text-center mt-1"></span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================ */}
        {/* Row: Trends */}
        {/* ============================ */}
        <div className="row">
          <div className="col-xl-8 mb-4">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 id="timeGroupedVisitsChartTitle">
                  Visits
                  <i className="bx bx-info-circle text-muted ms-1" data-bs-toggle="tooltip" title="Shows the number of visitors and page views over time based on the selected range."></i>
                </h5>
              </div>
              <div className="dashboard-placeholder d-none d-flex justify-content-center align-items-center" style={{ height: 300 }}>
                <div className="w-75">
                  <div className="placeholder-glow mb-3"><span className="placeholder col-10" /></div>
                  <div className="placeholder-glow mb-3"><span className="placeholder col-8" /></div>
                  <div className="placeholder-glow"><span className="placeholder col-6" /></div>
                </div>
              </div>
              <div className="card-body">
                <div id="timeGroupedVisitsChartWrapper" style={{ overflowX: "auto" }}>
                  <canvas id="timeGroupedVisitsChart" height={400} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Event Volume
                  <i className="bx bx-info-circle text-muted ms-1" data-bs-toggle="tooltip" title="Total number of pageviews, clicks, and other user events tracked."></i>
                </h5>
              </div>
              <div className="dashboard-placeholder d-none d-flex justify-content-center align-items-center" style={{ height: 300 }}>
                <div className="w-75">
                  <div className="placeholder-glow mb-3"><span className="placeholder col-10" /></div>
                  <div className="placeholder-glow mb-3"><span className="placeholder col-8" /></div>
                  <div className="placeholder-glow"><span className="placeholder col-6" /></div>
                </div>
              </div>
              <div className="card-body">
                <canvas id="eventVolumeChart" height={300} />
              </div>
            </div>
          </div>
        </div>

        {/* ============================ */}
        {/* Performance (4 charts) */}
        {/* ============================ */}
        <div className="row">
          <div className="col-md-6 col-xl-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Total Impressions</h5>
              </div>
              <div className="card-body" style={{ height: 320 }}>
                <canvas id="totalImpressionsChart" />
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Total Clicks</h5>
              </div>
              <div className="card-body" style={{ height: 320 }}>
                <canvas id="totalClicksChart" />
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Unique Visitors from Search</h5>
              </div>
              <div className="card-body" style={{ height: 320 }}>
                <canvas id="uniqueVisitorsFromSearchChart" />
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Conversions</h5>
              </div>
              <div className="card-body" style={{ height: 320 }}>
                <canvas id="conversionsChart" />
              </div>
            </div>
          </div>
        </div>

        {/* ============================ */}
        {/* Grid insights row */}
        {/* ============================ */}
        <div className="row">
          <div className="col-md-6 col-xl-6 mb-4">
            <div className="card h-100 text-center">
              <div className="card-body">
                <h5 className="d-flex align-items-center gap-2 mb-3">Unique vs Returning Visitors</h5>
                <div id="uniqueReturningChart" style={{ height: 300 }}></div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">All Visitors</h5>
              </div>
              <div className="card-body" style={{ height: 320 }}>
                <canvas id="allVisitorsChart" />
              </div>
            </div>
          </div>
        </div>

        {/* ============================ */}
        {/* Geographic Insights */}
        {/* ============================ */}
        <div className="row">
          <div className="col-lg-8 col-md-12 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">World Visitors</h5>
                <span className="text-muted small" id="countryMapTimeLabel"></span>
              </div>
              <div className="card-body" style={{ height: 620 }}>
                <div id="worldMapChart" style={{ height: "100%", width: "100%" }} />
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Visits by Country</h5>
              </div>
              <div className="card-body px-4">
                <table className="table table-borderless align-middle w-100">
                  <thead>
                    <tr className="text-muted">
                      <th className="ps-4 fs-6 fw-bold">Country</th>
                      <th className="text-center fs-6 fw-bold" colSpan={2}>Visitors</th>
                    </tr>
                  </thead>
                  <tbody id="countryVisitsTable"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ============================ */}
        {/* Tech Stack */}
        {/* ============================ */}
        <div className="row">
          <div className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Browsers</h5>
              </div>
              <div className="card-body">
                <canvas id="browsersChart"></canvas>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Operating Systems</h5>
              </div>
              <div className="card-body">
                <canvas id="osChart"></canvas>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Devices</h5>
              </div>
              <div className="card-body">
                <canvas id="devicesChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        {/* ============================ */}
        {/* Top Pages / Referrers */}
        {/* ============================ */}
        <div className="row">
          <div className="col-md-6 col-xl-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Top Pages</h5>
              </div>
              <div className="card-body px-4">
                <table className="table table-borderless align-middle w-100">
                  <thead>
                    <tr className="text-muted">
                      <th className="ps-4 fs-6 fw-bold">Pages</th>
                      <th className="text-center fs-6 fw-bold" colSpan={2}>Views</th>
                    </tr>
                  </thead>
                  <tbody id="topPagesTable"></tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="d-flex align-items-center gap-2 mb-3">Referrers</h5>
              </div>
              <div className="card-body px-4">
                <table className="table table-borderless align-middle w-100">
                  <thead>
                    <tr className="text-muted">
                      <th className="ps-4 fs-6 fw-bold">Referrer</th>
                      <th className="text-center fs-6 fw-bold" colSpan={2}>Visitors</th>
                    </tr>
                  </thead>
                  <tbody id="referrerList"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ============================ */}
        {/* Visitor Density Calendar */}
        {/* ============================ */}
        <div className="row">
          <div className="col-12 mb-4">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="d-flex align-items-center gap-2 mb-3">Visitor Density Calendar</h5>
                <select className="form-select form-select-sm w-auto" id="heatmapYear" defaultValue={new Date().getFullYear().toString()}>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
              <div className="card-body">
                <div id="visitorDensityHeatmap" style={{ height: 200 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
