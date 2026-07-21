# simple_skill — 汎用スキルでカンバンアプリを作る

`/constitution` `/spec` `/design` `/implement` の4スキルを使って、
仕様駆動でカンバンアプリを作るハンズオン。`simple_prompt`（プロンプトのみ）と
同じ最小構成のアプリを、スキル経由で作り直したもの。

スキル自体は技術スタックやドメインを固定しない**汎用定義**（`.claude/skills/`）で、
カンバンという題材や技術スタックは実行時のプロンプト・入力から決まる。
そのため空文字の扱い・文字数上限・存在しない ID への 404 などの要件も、
`constitution.md` と `spec/` に明示したうえで実装される（`simple_prompt` との違い）。

## 技術スタック

- Next.js 16（App Router）+ TypeScript + Tailwind CSS
- Prisma 7（`@prisma/adapter-better-sqlite3` の adapter 方式）+ SQLite
- Vitest / Node.js 20.19 以上 / npm

## 起動手順

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

`http://localhost:3000` を開く。検証は `npm run lint` / `npm run typecheck` / `npm run test` / `npm run build`。

## スキルで生成した成果物

| 種類 | パス | 内容 |
| --- | --- | --- |
| 方針 | `constitution.md` | 技術スタック・命名・エラー形式・検証コマンド |
| 仕様 | `spec/00_common.md` 〜 `spec/04_card_edit.md` | 共通ルールとボード・リスト・カード・カード編集の仕様 |
| 設計 | `design/001_minimum_kanban.md` | データモデル・API・画面・実装順序 |
| 実装 | `app/` `lib/` `prisma/` | ボード/リスト/カードの作成・表示・編集 |
| テスト | `tests/` | カードタイトルの正常系・空文字・上限・失敗時の非変更 |

## スキル（`.claude/skills/`）

`constitution` / `spec` / `design` / `implement` の4つ。いずれも技術・ドメインを
固定しない汎用定義で、別テーマに置き換える際もそのまま使える。書籍側の正本は
`ai_books/chapters/02_minimum_handson/skills/` にあり、本ディレクトリはその配布コピー。

## ステップと画面

| ステップ | 内容 | 主なファイル |
| --- | --- | --- |
| 1 | ボード一覧・新規ボード作成 | `app/page.tsx` / `app/api/boards` |
| 2 | ボード詳細・リスト作成 | `app/boards/[id]/page.tsx` / `app/api/boards/[id]/lists` |
| 3 | カード追加・表示 | `app/boards/[id]/_components/CardCreateForm.tsx` / `app/api/lists/[id]/cards` |
| 4 | カードタイトルのインライン編集 | `app/boards/[id]/_components/CardItem.tsx` / `app/api/cards/[id]` |
