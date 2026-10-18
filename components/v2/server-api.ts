import { headers } from "next/headers";
import { createMycodaoClient, MycodaoApiError, type MycodaoClient } from "@mycodao/sdk";

export type LoadResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

/**
 * Server components call this app's own gateway over loopback. Only the port is taken from the
 * request Host header, so a spoofed Host can never point server fetches at another machine.
 */
export function getServerOrigin(): string {
  const host = headers().get("host") ?? "";
  const portMatch = /:(\d{2,5})$/.exec(host);
  const port = portMatch?.[1] ?? process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

export function getServerClient(): MycodaoClient {
  return createMycodaoClient({ baseUrl: getServerOrigin() });
}

export async function load<T>(task: () => Promise<T>): Promise<LoadResult<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    if (error instanceof MycodaoApiError) return { ok: false, status: error.status, message: error.message };
    const message = error instanceof Error ? error.message : "The request could not be completed.";
    return { ok: false, status: 0, message };
  }
}

export async function loadJson<T>(path: string): Promise<LoadResult<T>> {
  return load(async () => {
    const response = await fetch(`${getServerOrigin()}${path}`, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new MycodaoApiError(response.status, "request_failed", `Request failed (${response.status}).`);
    return (await response.json()) as T;
  });
}

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(searchParams: SearchParams | undefined, key: string): string | undefined {
  const value = searchParams?.[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() ? first.trim() : undefined;
}
