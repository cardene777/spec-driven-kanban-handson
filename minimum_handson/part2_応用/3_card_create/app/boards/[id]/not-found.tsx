import Link from "next/link";

export default function BoardNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="text-5xl font-bold">404</p>
      <h1 className="text-xl font-semibold">ボードが見つかりません</h1>
      <p className="text-sm text-gray-500">
        指定されたボードは存在しないか、削除された可能性があります。
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        ボード一覧へ戻る
      </Link>
    </main>
  );
}
