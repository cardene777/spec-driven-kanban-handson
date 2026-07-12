// design/011_auth.md § 主要 Client Component > SignupForm
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

type Fields = Partial<Record<"email" | "password" | "name", string>>;

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
          const res = await apiFetch("/api/auth/signup", {
            method: "POST",
            body: JSON.stringify({ email, password, name }),
          });
          if (res.status === 201) {
            router.push("/");
            router.refresh();
            return;
          }
          const data = await res.json().catch(() => ({}));
          if (res.status === 422) {
            setFieldErrors(data.fields ?? {});
          } else if (res.status === 409) {
            setTopError("このメールアドレスは既に登録されています。");
          } else {
            setTopError("登録に失敗しました。しばらくして再度お試しください。");
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
        <label className="block text-sm">パスワード (8 文字以上、英数字記号)</label>
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
      <div>
        <label className="block text-sm">表示名 (1-100 文字)</label>
        <input
          type="text"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {fieldErrors.name ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
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
        {busy ? "登録中..." : "登録する"}
      </button>
    </form>
  );
}
