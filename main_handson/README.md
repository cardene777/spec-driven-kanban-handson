# Simple Kanban

小規模チーム向けのカンバンアプリ（ボード・リスト・カードの作成・表示・編集）。
方針は [constitution.md](./constitution.md)、仕様は [spec/](./spec)、設計は [design/](./design) を参照。

## 技術スタック

Next.js 16 (App Router) / TypeScript / SQLite / Prisma 7 (better-sqlite3 adapter) / Tailwind CSS / Vitest 4 / npm

## セットアップ

```bash
# Node.js 20.19 以上（Prisma 7 / Vitest 4 のため 22 系を推奨）
npm install
cp .env.example .env
npx prisma migrate dev   # SQLite にスキーマを反映
npm run dev              # http://localhost:3000
```

## 検証コマンド

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest（Prisma を mock、DB 不要）
npm run build      # Next.js production build
```

## 構成

- `app/` … 画面（`/` ボード一覧、`/boards/[id]` ボード詳細）と Route Handler（`app/api/**`）
- `lib/` … Prisma client・エラー整形・入力検証・監査ログなど共通処理
- `prisma/` … スキーマとマイグレーション
- `tests/` … API テスト
