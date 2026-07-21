// spec/011_auth.md § 画面（サインアップ）
// 認証系 page は AppShell を使わず、全画面中央のカードパネルで表示する。
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SignupForm from "./_components/SignupForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">アカウント作成</CardTitle>
          <p className="text-sm text-muted-foreground">Simple Kanban を始めます</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SignupForm />
          <p className="text-sm text-muted-foreground">
            アカウントをお持ちの場合は{" "}
            <Link href="/login" className="text-primary hover:underline">
              ログイン
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
