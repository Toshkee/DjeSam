import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { getParkingVersion, getRepositories, subscribeParking } from './service';
import type { ParkingSession } from './types';

function useParkingVersion(): number {
  return useSyncExternalStore(subscribeParking, getParkingVersion);
}

interface QueryResult<T> {
  /** Identifies which request produced this result. */
  request: string;
  data: T | undefined;
  error: unknown;
}

/**
 * Runs a query and re-runs it whenever parking data changes anywhere in the app. The previous
 * data stays visible while a refresh is in flight, so screens don't flash a spinner.
 */
function useParkingQuery<T>(query: () => Promise<T>, key: string) {
  const version = useParkingVersion();
  const [reloadCount, setReloadCount] = useState(0);
  const request = `${key}|${version}|${reloadCount}`;
  const [result, setResult] = useState<QueryResult<T>>({ request: '', data: undefined, error: null });

  useEffect(() => {
    let cancelled = false;
    query().then(
      (data) => !cancelled && setResult({ request, data, error: null }),
      (error: unknown) => !cancelled && setResult((r) => ({ ...r, request, error })),
    );
    return () => {
      cancelled = true;
    };
    // `query` is recreated each render; `request` already captures its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);
  return { data: result.data, error: result.error, loading: result.request !== request, reload };
}

export function useActiveSession() {
  return useParkingQuery(async () => (await getRepositories()).parking.getActive(), 'active');
}

export function useSession(id: string | undefined) {
  return useParkingQuery(
    async () => (id ? (await getRepositories()).parking.getById(id) : null),
    `session:${id ?? ''}`,
  );
}

const PAGE_SIZE = 30;

/** Paged history list; reloads the loaded window whenever data changes. */
export function useHistory() {
  const version = useParkingVersion();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [items, setItems] = useState<ParkingSession[] | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const loadingMore = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { parking } = await getRepositories();
        const [list, count] = await Promise.all([parking.list(limit), parking.count()]);
        if (cancelled) return;
        setItems(list);
        setTotal(count);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        loadingMore.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [version, limit, reloadCount]);

  const loadMore = useCallback(() => {
    if (loadingMore.current || (items && items.length >= total)) return;
    loadingMore.current = true;
    setLimit((l) => l + PAGE_SIZE);
  }, [items, total]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  return { items, total, error, loading: items === undefined && !error, loadMore, reload };
}
