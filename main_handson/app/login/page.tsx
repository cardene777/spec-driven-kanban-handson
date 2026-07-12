// spec/011_auth.md § FR-02 / design/011_auth.md § UI 構造
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUserFromCookies();
  if (user) redirect("/");

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">ログイン</h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-sm">
        アカウントがない場合は{" "}
        <Link href="/signup" className="text-blue-600 hover:underline">
          サインアップ
        </Link>
      </p>
    </main>
  );
}
