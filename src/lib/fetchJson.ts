"use client";

export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * JSON fetch with an AbortController deadline (default 55s, under mobile
 * Safari's ~60s fetch abort) that maps failures onto the envelope shape.
 */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 55_000
): Promise<ApiEnvelope<T> & { status?: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
      signal: controller.signal,
    });
    const json = (await res.json()) as ApiEnvelope<T>;
    return { ...json, status: res.status };
  } catch (err) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { ok: false, error: "You are offline. Check your connection and try again." };
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "That took too long. Please try again." };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}
