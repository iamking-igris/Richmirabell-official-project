import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api/errors";

export interface AdminQueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  errorStatus: number | null;
  reload: (force?: boolean) => Promise<void>;
}

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const inflight = new Map<string, Promise<unknown>>();

export function invalidateAdminQuery(cacheKey?: string): void {
  if (!cacheKey) {
    cache.clear();
    return;
  }
  cache.delete(cacheKey);
}

/**
 * Cached, de-duplicated loader for operational admin pages.
 * Inline loaders are accepted; pass a stable cacheKey to reuse data between route visits.
 */
export function useAdminQuery<T>(
  loader: () => Promise<T>,
  options?: { cacheKey?: string; cacheMs?: number; pollMs?: number },
): AdminQueryState<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const dataRef = useRef<T | null>(null);
  const cacheKey = options?.cacheKey;
  const cacheMs = options?.cacheMs ?? 15_000;
  const [data, setData] = useState<T | null>(() => {
    if (!cacheKey) return null;
    const cached = cache.get(cacheKey);
    const initial = cached ? (cached.data as T) : null;
    dataRef.current = initial;
    return initial;
  });
  const [loading, setLoading] = useState(() => dataRef.current === null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const reload = useCallback(
    async (force = false) => {
      const requestId = ++requestRef.current;
      setError(null);
      setErrorStatus(null);

      if (cacheKey) {
        const cached = cache.get(cacheKey);
        if (!force && cached && cached.expiresAt > Date.now()) {
          if (mountedRef.current) {
            setData(cached.data as T);
            setLoading(false);
          }
          return;
        }
      }

      setLoading(dataRef.current === null);
      try {
        let promise: Promise<T>;
        if (cacheKey && inflight.has(cacheKey)) {
          promise = inflight.get(cacheKey) as Promise<T>;
        } else {
          promise = loaderRef.current();
          if (cacheKey) {
            inflight.set(cacheKey, promise);
            void promise.finally(() => inflight.delete(cacheKey));
          }
        }
        const result = await promise;
        if (!mountedRef.current || requestId !== requestRef.current) return;
        setData(result);
        dataRef.current = result;
        if (cacheKey) cache.set(cacheKey, { data: result, expiresAt: Date.now() + cacheMs });
      } catch (err) {
        if (!mountedRef.current || requestId !== requestRef.current) return;
        if (err instanceof ApiError) {
          setError(err.message);
          setErrorStatus(err.statusCode);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        if (mountedRef.current && requestId === requestRef.current) setLoading(false);
      }
    },
    [cacheKey, cacheMs],
  );

  useEffect(() => {
    mountedRef.current = true;
    void reload();
    return () => {
      mountedRef.current = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!options?.pollMs) return;
    const poll = () => {
      if (document.visibilityState === "visible") void reload(true);
    };
    const interval = window.setInterval(poll, options.pollMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [options?.pollMs, reload]);

  return { data, loading, error, errorStatus, reload };
}
