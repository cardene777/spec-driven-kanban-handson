// spec/001_boards.md § 画面レベル (404 表示) SSOT
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M8 15c1.5-2 6.5-2 8 0M9 9h.01M15 9h.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          ボードが見つかりません
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          指定されたボードは存在しないか、 閲覧権限がありません。
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-neutral-0 shadow-sm transition-all hover:bg-primary-700 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          ボード一覧に戻る
        </Link>
      </div>
    </main>
  );
}
