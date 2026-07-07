# Step 1: ボード一覧画面

カンバンの「ボード一覧画面」を作るステップです。Next.js（App Router）のプロジェクトを初期化し、
Prisma + SQLite でボードを永続化し、一覧表示と新規作成ができるところまでを実装します。

> このディレクトリには、**このステップ完了時点のコード全体**が入っています。
> そのままコピーすれば単体で動作します。

## このステップでやること

- TypeScript + Tailwind CSS + App Router 構成で Next.js を初期化
- Prisma + SQLite を追加し、初期マイグレーションを実行
- `Board` モデル（`id` / `title` / `createdAt`）を定義
- API `GET /api/boards`（`createdAt` 降順）/ `POST /api/boards`（作成）を実装
- `app/page.tsx` でボード一覧を表示し、「新規ボード作成」フォームから作成できるようにする

## セットアップ手順

```bash
# 1. 依存関係をインストール
npm install

# 2. 環境変数ファイルを用意
cp .env.example .env

# 3. DB を作成（マイグレーション適用 + Prisma Client 生成）
npx prisma migrate dev

# 4. 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開くと、ボード一覧画面が表示されます。
「新規ボード作成」ボタンからタイトルを入力して送信すると、ボードが作成されて一覧に追加されます。

## 主なファイル

| パス | 役割 |
| --- | --- |
| `prisma/schema.prisma` | `Board` モデル定義（`id` / `title` / `createdAt`） |
| `prisma/migrations/` | 初期マイグレーション |
| `lib/prisma.ts` | PrismaClient のシングルトン（開発時の多重生成を防止） |
| `app/api/boards/route.ts` | `GET`（一覧・降順）/ `POST`（作成・バリデーション付き） |
| `app/page.tsx` | ボード一覧画面（Server Component で DB を直接読み取り） |
| `app/CreateBoardForm.tsx` | 新規作成フォーム（Client Component） |

## 動作確認（API）

```bash
# 作成
curl -X POST http://localhost:3000/api/boards \
  -H "Content-Type: application/json" \
  -d '{"title":"最初のボード"}'

# 一覧（createdAt 降順）
curl http://localhost:3000/api/boards
```

## 補足

- Node.js は v20.12 環境での動作を確認しています。Prisma は Node 20.12 と互換の `6.5.0` を使用しています。
- `Board.id` は `cuid()` の文字列です。連番の整数にしたい場合は
  `id Int @id @default(autoincrement())` に変更してください。
