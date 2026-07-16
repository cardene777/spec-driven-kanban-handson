// design/011_auth.md § 主要 Client Component > SignupForm
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      className="space-y-4"
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
      <div className="space-y-1.5">
        <Label htmlFor="signup-email">メールアドレス</Label>
        <Input
          id="signup-email"
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
        <Label htmlFor="signup-password">
          パスワード (8 文字以上、英数字記号)
        </Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {fieldErrors.password ? (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-name">表示名 (1-100 文字)</Label>
        <Input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {fieldErrors.name ? (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>
      {topError ? (
        <p className="text-sm text-destructive">{topError}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "登録中..." : "登録する"}
      </Button>
    </form>
  );
}
