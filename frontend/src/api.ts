import type { Evaluation, ListEntry, Reference } from "./types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, { method = "GET", body }: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch("/api" + path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try {
      const j = await r.json();
      if (j.detail) msg = typeof j.detail === "string" ? j.detail : "Invalid input";
    } catch { /* non-JSON error body */ }
    throw new ApiError(msg, r.status);
  }
  if (r.status === 204) return null as T;
  return ((r.headers.get("content-type") ?? "").includes("json") ? r.json() : r.text()) as Promise<T>;
}

export const evalPath = (id: number) => `/evaluations/${id}`;
export const itemPath = (id: number, heuristic: number) => `${evalPath(id)}/items/${heuristic}`;
export const exportUrl = (id: number, kind: "md" | "csv") =>
  `/api${evalPath(id)}/export.${kind}${kind === "md" ? "?download=1" : ""}`;

export const api = {
  reference: () => request<Reference>("/reference"),
  list: () => request<ListEntry[]>("/evaluations"),
  get: (id: number) => request<Evaluation>(evalPath(id)),
  create: (sample: boolean) => request<Evaluation>("/evaluations", { method: "POST", body: sample ? { sample: true } : {} }),
  duplicate: (id: number) => request<Evaluation>(`${evalPath(id)}/duplicate`, { method: "POST" }),
  reset: (id: number) => request<Evaluation>(`${evalPath(id)}/reset`, { method: "POST" }),
  remove: (id: number) => request<null>(evalPath(id), { method: "DELETE" }),
  markdown: (id: number) => request<string>(`${evalPath(id)}/export.md`),
  patch: (path: string, body: object) => request<unknown>(path, { method: "PATCH", body }),
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
