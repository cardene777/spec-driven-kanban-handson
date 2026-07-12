// design/011_auth.md § apiFetch の変更
// Cookie は fetch が same-origin で自動送信するため、追加 header は不要。
"use client";

export async function apiFetch(input: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (
    init?.body !== undefined &&
    !headers.has("content-type") &&
    typeof init.body === "string"
  ) {
    headers.set("content-type", "application/json");
  }
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
