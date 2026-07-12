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
      className="space-y-3"
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
        <label className="block text-sm">メールアドレス</label>
        <input
          type="email"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {fieldErrors.email ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
        ) : null}
      </div>
      <div>
        <label className="block text-sm">パスワード</label>
        <input
          type="password"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {fieldErrors.password ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
        ) : null}
      </div>
      {topError ? (
        <p className="text-sm text-red-600">{topError}</p>
      ) : null}
      <button
        type="submit"
        className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        disabled={busy}
      >
        {busy ? "ログイン中..." : "ログインする"}
      </button>
    </form>
  );
}
