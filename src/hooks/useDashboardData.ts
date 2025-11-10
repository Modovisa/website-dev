import { useQuery } from '@tanstack/react-query';
import type { DashboardPayload, RangeKey } from '@/types/dashboard';

type Params = { siteId?: number | string; range: RangeKey };

const API = 'https://api.modovisa.com/api/user-dashboard-analytics';

export function useDashboardData({ siteId, range }: Params) {
  return useQuery<DashboardPayload>({
    queryKey: ['dashboard', siteId, range],
    queryFn: async () => {
      const tzOffset = new Date().getTimezoneOffset();
      const url = `${API}?range=${range}&tz_offset=${tzOffset}&site_id=${encodeURIComponent(
        siteId ?? ''
      )}`;
      // if you have secureFetch, swap here
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 401) throw new Error('unauthorized');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    enabled: !!siteId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
