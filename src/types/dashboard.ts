export type RangeKey = '24h' | '7d' | '30d' | '90d' | '12mo';

export type LabelCount = { label: string; count: number };
export type LabelSeries = { label: string; visitors?: number; views?: number };

export type CountryRow = { country: string; iso_code?: string; count: number };
export type ReferrerRow = { domain: string; visitors: number };
export type BrowserRow = { name: string; count: number };
export type DeviceRow = { type: string; count: number };
export type OSRow = { name: string; count: number };
export type TopPageRow = { url: string; views: number };
export type UTMSourceRow = { source: string; visitors: number };
export type UTMCampaignRow = { url: string; visitors: number };

export type PerformanceSeries = {
  impressions_timeline?: LabelCount[];
  impressions_previous_timeline?: LabelCount[];
  clicks_timeline?: LabelCount[];
  clicks_previous_timeline?: LabelCount[];
  search_visitors_timeline?: LabelCount[];
  search_visitors_previous_timeline?: LabelCount[];
  conversions_timeline?: LabelCount[];
  conversions_previous_timeline?: LabelCount[];
};

export type DashboardPayload = PerformanceSeries & {
  range: RangeKey;
  live_visitors?: number;
  unique_visitors?: { total: number; delta?: number };
  bounce_rate?: number;
  bounce_rate_delta?: number;
  avg_duration?: string; // e.g. '4m 32s'
  avg_duration_delta?: number;
  conversions_per_user?: number | null;
  conversions_per_user_delta?: number | null;
  revenue_per_user?: number | null;
  revenue_per_user_delta?: number | null;
  multi_page_visits?: number | string;
  multi_page_visits_delta?: number | null;

  time_grouped_visits?: LabelSeries[];
  events_timeline?: LabelCount[];

  unique_vs_returning?: { label: string; unique: number; returning: number }[];

  countries?: CountryRow[];
  referrers?: ReferrerRow[];

  browsers?: BrowserRow[];
  devices?: DeviceRow[];
  os?: OSRow[];

  top_pages?: TopPageRow[];
  utm_sources?: UTMSourceRow[];
  utm_campaigns?: UTMCampaignRow[];

  calendar_density?: [string, number][]; // [['2025-06-08', 123], ...]
};

export type GeoCityPoint = {
  city?: string;
  country?: string;
  lat: number;
  lng: number;
  count: number;
  debug_ids?: string[];
};
