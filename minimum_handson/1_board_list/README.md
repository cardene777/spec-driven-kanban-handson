# ステップ1: ボード一覧画面 + ボード作成

このステップまでの完成コードのスナップショットです（ソースのみ。生成物は含みません）。

## このステップで作るもの

- Next.js（App Router）+ TypeScript + Tailwind CSS のプロジェクト
- Prisma + SQLite による永続化（`Board` モデル: `id` / `title` / `createdAt`）
- API ルート
  - `GET /api/boards` … ボードを `createdAt` の降順で返す
  - `POST /api/boards` … `title` を受け取ってボードを作成する（`title` 必須、空文字は 400）
- 画面（`app/page.tsx`）
  - ボード一覧を `createdAt` の降順で表示
  - 「新規ボード作成」ボタンでフォームを表示し、タイトルを入力・送信すると作成 →
    一覧を再取得して反映

## 主なファイル

| ファイル | 役割 |
| --- | --- |
| `prisma/schema.prisma` | `Board` モデルの定義 |
| `lib/prisma.ts` | PrismaClient のシングルトン |
| `app/api/boards/route.ts` | `GET` / `POST /api/boards` |
| `app/page.tsx` | ボード一覧（サーバーコンポーネントで一覧を取得） |
| `app/new-board-form.tsx` | 新規作成フォーム（クライアントコンポーネント） |

## 動かし方

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

http://localhost:3000 を開くと、ボード一覧画面が表示されます。
