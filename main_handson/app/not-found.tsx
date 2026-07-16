// spec/001_boards.md § 画面レベル (404 表示) SSOT
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted/40 px-4 py-16">
      <div className="max-w-2xl text-center">
        <h1 className="font-heading text-2xl font-semibold">
          ボードが見つかりません
        </h1>
        <p className="mt-4 text-muted-foreground">
          指定されたボードは存在しないか、 閲覧権限がありません。
        </p>
        <Button className="mt-6" render={<Link href="/" />}>
          ボード一覧に戻る
        </Button>
      </div>
    </main>
  );
}
