# simple_skill — スキルで最小カンバンを作る

第2章のスキル版ハンズオンです。`simple_prompt` と同じ最小カンバンを、`/constitution`、`/spec`、`/design`、`/implement` の4スキルを順に使って作ります。

このディレクトリのスキルは、第2章で同じ題材・実装条件を比較するための**固定版**です。カンバン、Next.js、Prisma 7、SQLite、Vitestを前提にしています。第5章の `main_handson` にある11スキルは、技術やドメインを固定しない汎用版です。

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

`http://localhost:3000` を開きます。

## 検証

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## スキルで生成した成果物

| 種類 | パス | 内容 |
| --- | --- | --- |
| 方針 | `constitution.md` | 技術スタック・命名・エラー形式・検証コマンド |
| 仕様 | `spec/00_common.md` 〜 `spec/04_card_edit.md` | 共通ルールとボード・リスト・カード・カード編集の仕様 |
| 設計 | `design/001_minimum_kanban.md` | データモデル・API・画面・実装順序 |
| 実装 | `app/` `lib/` `prisma/` | ボード/リスト/カードの作成・表示・編集 |
| テスト | `tests/` | カードタイトルの正常系・空文字・上限・失敗時の非変更 |

## スキル（`.claude/skills/`）

第2章で使う4つの固定スキルを含みます。導入方法と呼び出し順は[スキルのREADME](./.claude/skills/README.md)を参照してください。

## ステップと画面

| ステップ | 内容 | 主なファイル |
| --- | --- | --- |
| 1 | ボード一覧・新規ボード作成 | `app/page.tsx` / `app/api/boards` |
| 2 | ボード詳細・リスト作成 | `app/boards/[id]/page.tsx` / `app/api/boards/[id]/lists` |
| 3 | カード追加・表示 | `app/boards/[id]/_components/CardCreateForm.tsx` / `app/api/lists/[id]/cards` |
| 4 | カードタイトルのインライン編集 | `app/boards/[id]/_components/CardItem.tsx` / `app/api/cards/[id]` |
