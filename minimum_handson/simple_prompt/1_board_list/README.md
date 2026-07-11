# Step 1: ボード一覧画面と新規ボード作成

書籍 第 2 章「プロンプトのみで開発する」ステップ 1 完了時点のスナップショット。

## このステップで追加したもの

- Next.js (App Router) + TypeScript + Tailwind CSS の初期化
- Prisma + SQLite (`prisma/schema.prisma` に `Board` モデル)
- 初期マイグレーション (`prisma/migrations/20260711080704_init/`)
- `lib/prisma.ts` = PrismaClient singleton
- `app/api/boards/route.ts` = GET (createdAt 降順) / POST (title 必須 400 バリデーション)
- `app/page.tsx` = ボード一覧 Server Component
- `app/_components/NewBoardForm.tsx` = 新規作成 Client Component

## 動作確認結果

- POST 2 件 (「プロダクトロードマップ」「個人 TODO」) → 201
- POST 空タイトル → 400 `{"error":"title is required"}`
- GET → createdAt 降順で 2 件返る
- `/` に「ボード一覧」「新規ボード作成」「作成済みの 2 件」 が表示される

## 補足

- Prisma は 7 系で `env("DATABASE_URL")` を schema に書く形式が P1012 エラーになったため、 6 系にダウングレードして解決
- `.env` は書籍運用モデルどおり snapshot から除外 (実行時は各自で作成)
- スナップショットに含めないもの = `node_modules/` / `.next/` / `.env` / `prisma/dev.db` / `next-env.d.ts`
