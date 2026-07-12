// spec/011_auth.md § FR-01 / design/011_auth.md § UI 構造
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import SignupForm from "@/components/auth/SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getCurrentUserFromCookies();
  if (user) redirect("/");

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">サインアップ</h1>
      <SignupForm />
      <p className="mt-4 text-sm">
        既にアカウントをお持ちですか?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          ログイン
        </Link>
      </p>
    </main>
  );
}
