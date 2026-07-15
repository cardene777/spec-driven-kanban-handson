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
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-lg font-bold text-neutral-0 shadow-md">
            SK
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Simple Kanban にログイン
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            チームでタスクを整理する場所へ
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-8 shadow-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          アカウントがない場合は{" "}
          <Link
            href="/signup"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            サインアップ
          </Link>
        </p>
      </div>
    </main>
  );
}
