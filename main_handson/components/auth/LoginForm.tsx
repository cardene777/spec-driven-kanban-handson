// design/011_auth.md § 主要 Client Component > LoginForm
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

type Fields = Partial<Record<"email" | "password", string>>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Fields>({});
  const [topError, setTopError] = useState<string | null>(null);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setFieldErrors({});
        setTopError(null);
        try {
          const res = await apiFetch("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
          if (res.status === 200) {
            router.push(returnTo);
            router.refresh();
            return;
          }
          const data = await res.json().catch(() => ({}));
          if (res.status === 422) {
            setFieldErrors(data.fields ?? {});
          } else if (res.status === 401) {
            setTopError("メールアドレスまたはパスワードが正しくありません。");
          } else {
            setTopError("ログインに失敗しました。しばらくして再度お試しください。");
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-neutral-700">
          メールアドレス
        </label>
        <input
          id="login-email"
          type="email"
          className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-neutral-0 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {fieldErrors.email ? (
          <p className="mt-1.5 text-xs text-danger">{fieldErrors.email}</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700">
          パスワード
        </label>
        <input
          id="login-password"
          type="password"
          className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-neutral-0 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {fieldErrors.password ? (
          <p className="mt-1.5 text-xs text-danger">{fieldErrors.password}</p>
        ) : null}
      </div>
      {topError ? (
        <div className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger">
          {topError}
        </div>
      ) : null}
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-neutral-0 shadow-sm transition-all hover:bg-primary-700 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
      >
        {busy ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
