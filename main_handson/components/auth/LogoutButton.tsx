// design/011_auth.md § 主要 Client Component > LogoutButton
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={busy}
      aria-label="ログアウト"
      onClick={async () => {
        setBusy(true);
        await apiFetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
    </Button>
  );
}
