import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api } from "../api";
import { useLatest } from "./useLatest";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Job {
  path: string;
  body: Record<string, unknown>;
}

const RETRY_MS = 4000;

/**
 * Debounced PATCH queue. Edits are merged per key and sent in order through one promise
 * chain, so a slow request can never overwrite a newer one. Network and 5xx failures are
 * retried; 4xx failures are dropped (retrying a rejected payload would never succeed).
 */
export function useSaveQueue(onError: (message: string) => void) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const onErrorRef = useLatest(onError);
  const q = useRef({
    pending: new Map<string, Job>(),
    chain: Promise.resolve(),
    flushTimer: undefined as number | undefined,
    retryTimer: undefined as number | undefined,
    inflight: 0,
  }).current;

  const flush = useCallback((): Promise<void> => {
    clearTimeout(q.flushTimer);
    const jobs = [...q.pending];
    q.pending.clear();
    if (!jobs.length) return q.chain;
    q.inflight++;
    q.chain = q.chain.then(async () => {
      let error: unknown = null;
      for (const [key, job] of jobs) {
        try {
          await api.patch(job.path, job.body);
        } catch (e) {
          error = e;
          const retryable = !(e instanceof ApiError) || e.status >= 500;
          if (!retryable) continue;
          // Put it back underneath any newer edit to the same target.
          const newer = q.pending.get(key);
          q.pending.set(key, { path: job.path, body: { ...job.body, ...newer?.body } });
        }
      }
      q.inflight--;
      if (error) {
        setStatus("error");
        const msg = error instanceof Error ? error.message : String(error);
        onErrorRef.current(`Couldn't save: ${msg}${q.pending.size ? ". Retrying…" : ""}`);
        clearTimeout(q.retryTimer);
        if (q.pending.size) q.retryTimer = window.setTimeout(flush, RETRY_MS);
      } else if (!q.pending.size && !q.inflight) {
        setStatus("saved");
      }
    });
    return q.chain;
  }, [q, onErrorRef]);

  const queue = useCallback((key: string, path: string, patch: Record<string, unknown>, delay = 450) => {
    const cur = q.pending.get(key);
    q.pending.set(key, { path, body: { ...cur?.body, ...patch } });
    setStatus("saving");
    clearTimeout(q.flushTimer);
    q.flushTimer = window.setTimeout(flush, delay);
  }, [q, flush]);

  /** Discard unsent edits under a path, e.g. for an evaluation that is about to be deleted. */
  const drop = useCallback((prefix: string) => {
    for (const [k, j] of q.pending) if (j.path === prefix || j.path.startsWith(prefix + "/")) q.pending.delete(k);
  }, [q]);

  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!q.pending.size && !q.inflight) return;
      flush();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [q, flush]);

  return useMemo(() => ({ status, queue, flush, drop }), [status, queue, flush, drop]);
}
