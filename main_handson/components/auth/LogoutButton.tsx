// design/011_auth.md § 主要 Client Component > LogoutButton
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await apiFetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      {busy ? "ログアウト中..." : "ログアウト"}
    </button>
  );
}
