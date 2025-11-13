// src/types/dashboard.ts

export type RangeKey = "24h" | "7d" | "30d" | "90d" | "12mo";

export type TimeBucket = {
  label: string;
  visitors: number;
  views: number;
};

export type LabelCount = {
  label: string;
  count: number;
};

export type UniqueReturningPoint = {
  label: string;
  unique: number;
  returning: number;
};

export type ReferrerRow = {
  domain: string;
  visitors: number;
};

export type TopPageRow = {
  url: string;
  views: number;
};

export type TechSlice = { name?: string; type?: string; count: number };

export type CountryRow = { country: string; iso_code?: string; count: number };

export type UTMCampaignRow = { url: string; visitors: number };
export type UTMSrcRow = { source: string; visitors: number };

export type DashboardPayload = {
  range: RangeKey;

  live_visitors?: number;

  unique_visitors?: { total: number; delta?: number };
  bounce_rate?: number;
  bounce_rate_delta?: number;
  avg_duration?: string | number;
  avg_duration_delta?: number;
  
  // Additional KPIs from Bootstrap version
  revenue_per_user?: number;
  revenue_per_user_delta?: number;
  conversions_per_user?: number;
  conversions_per_user_delta?: number;
  multi_page_visits?: number;
  multi_page_visits_delta?: number;

  // charts
  time_grouped_visits?: TimeBucket[];
  events_timeline?: LabelCount[];

  unique_vs_returning?: UniqueReturningPoint[];

  impressions_timeline?: LabelCount[];
  impressions_previous_timeline?: LabelCount[];

  clicks_timeline?: LabelCount[];
  clicks_previous_timeline?: LabelCount[];

  conversions_timeline?: LabelCount[];
  conversions_previous_timeline?: LabelCount[];

  search_visitors_timeline?: LabelCount[];
  search_visitors_previous_timeline?: LabelCount[];

  unique_visitors_timeline?: LabelCount[];
  previous_unique_visitors_timeline?: LabelCount[];

  top_pages?: TopPageRow[];
  referrers?: ReferrerRow[];

  browsers?: TechSlice[];
  devices?: TechSlice[];
  os?: TechSlice[];

  utm_campaigns?: UTMCampaignRow[];
  utm_sources?: UTMSrcRow[];

  countries?: CountryRow[];

  // optional: calendar, map etc.
  calendar_density?: [string, number][];
  page_flow?: { nodes: any[]; links: any[] };
  funnel?: any[];
};