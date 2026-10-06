type Route = {
  match: (url: string, init?: RequestInit) => boolean;
  status?: number;
  body: string | object;
};

export function mockFetch(routes: Route[]): { calls: { url: string; init?: RequestInit }[] } {
  const calls: { url: string; init?: RequestInit }[] = [];
  (globalThis as any).fetch = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const route = routes.find(r => r.match(url, init));
    if (!route) {
      return {
        ok: false,
        status: 404,
        url,
        text: async () => 'not found',
      };
    }
    const status = route.status ?? 200;
    const body = typeof route.body === 'string' ? route.body : JSON.stringify(route.body);
    return {
      ok: status >= 200 && status < 300,
      status,
      url,
      text: async () => body,
    };
  });
  return { calls };
}

export const urlIs = (expected: string) => (url: string) => url === expected;
export const urlStarts = (prefix: string) => (url: string) => url.startsWith(prefix);
