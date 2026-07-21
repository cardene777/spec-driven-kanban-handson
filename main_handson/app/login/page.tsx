// spec/011_auth.md § 画面（ログイン）
// 認証系 page は AppShell を使わず、全画面中央のカードパネルで表示する。
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "./_components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">ログイン</CardTitle>
          <p className="text-sm text-muted-foreground">Simple Kanban にログインします</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LoginForm />
          <p className="text-sm text-muted-foreground">
            アカウントがない場合は{" "}
            <Link href="/signup" className="text-primary hover:underline">
              新規登録
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
