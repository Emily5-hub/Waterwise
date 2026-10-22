export type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<{
  ok: boolean; status: number; json: () => Promise<unknown>;
}>;

export class ServiceError extends Error {
  constructor(public code: 'network' | 'rate_limited' | 'not_found' | 'invalid_response' | 'http', message: string) {
    super(message);
  }
}

export async function getJson(url: string, fetchImpl: FetchLike, timeoutMs = 10000): Promise<unknown> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : undefined;
  let res;
  try {
    res = await fetchImpl(url, ctrl ? { signal: ctrl.signal } : undefined);
  } catch {
    throw new ServiceError('network', 'Couldn’t reach the service. Check your connection and try again.');
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (res.status === 429) throw new ServiceError('rate_limited', 'The service is busy (rate limited). Wait a minute and retry.');
  if (!res.ok) throw new ServiceError('http', `The service returned an error (HTTP ${res.status}). Try again later.`);
  try {
    return await res.json();
  } catch {
    throw new ServiceError('invalid_response', 'The service sent an unreadable response.');
  }
}
