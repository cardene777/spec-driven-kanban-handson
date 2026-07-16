// design/011_auth.md § 主要 Client Component > LoginForm
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      className="space-y-4"
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
      <div className="space-y-1.5">
        <Label htmlFor="login-email">メールアドレス</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {fieldErrors.email ? (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">パスワード</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {fieldErrors.password ? (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>
      {topError ? (
        <p className="text-sm text-destructive">{topError}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "ログイン中..." : "ログインする"}
      </Button>
    </form>
  );
}
