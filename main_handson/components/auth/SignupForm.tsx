// design/011_auth.md § 主要 Client Component > SignupForm
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

type Fields = Partial<Record<"email" | "password" | "name", string>>;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-neutral-0 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10";

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
      className="space-y-5"
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
        <label htmlFor="signup-email" className="block text-sm font-medium text-neutral-700">
          メールアドレス
        </label>
        <input
          id="signup-email"
          type="email"
          className={inputClass}
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
        <label htmlFor="signup-password" className="block text-sm font-medium text-neutral-700">
          パスワード
        </label>
        <input
          id="signup-password"
          type="password"
          className={inputClass}
          placeholder="8 文字以上、英数字記号を含む"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {fieldErrors.password ? (
          <p className="mt-1.5 text-xs text-danger">{fieldErrors.password}</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="signup-name" className="block text-sm font-medium text-neutral-700">
          表示名
        </label>
        <input
          id="signup-name"
          type="text"
          className={inputClass}
          placeholder="山田 太郎"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {fieldErrors.name ? (
          <p className="mt-1.5 text-xs text-danger">{fieldErrors.name}</p>
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
        {busy ? "登録中..." : "アカウントを作成"}
      </button>
    </form>
  );
}
