// spec/011_auth.md § FR-01 / design/011_auth.md § UI 構造
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import SignupForm from "@/components/auth/SignupForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getCurrentUserFromCookies();
  if (user) redirect("/");

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">サインアップ</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="mt-4 text-sm text-muted-foreground">
            既にアカウントをお持ちですか?{" "}
            <Link href="/login" className="text-primary hover:underline">
              ログイン
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
