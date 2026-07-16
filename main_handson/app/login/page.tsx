// spec/011_auth.md § FR-02 / design/011_auth.md § UI 構造
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import LoginForm from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUserFromCookies();
  if (user) redirect("/");

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">ログイン</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <p className="mt-4 text-sm text-muted-foreground">
            アカウントがない場合は{" "}
            <Link href="/signup" className="text-primary hover:underline">
              サインアップ
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
