// spec/001_boards.md § 画面レベル (404 表示) SSOT
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">ボードが見つかりません</h1>
      <p className="mt-4 text-gray-600">
        指定されたボードは存在しないか、 閲覧権限がありません。
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded bg-black px-4 py-2 text-white"
      >
        ボード一覧に戻る
      </Link>
    </main>
  );
}
