# spec-driven-kanban-handson

Next.js（App Router）+ Prisma + SQLite でカンバンアプリを段階的に作るハンズオンです。

## この構成について

- リポジトリのルートは、**最新ステップの作業用プロジェクト**です。
- [`minimum_handson/`](./minimum_handson/) に、**ステップごとの累積スナップショット**を置いています。
  各ステップのディレクトリを開くと、そこまでの完成コード全体を確認できます。詳細は
  [`minimum_handson/README.md`](./minimum_handson/README.md) を参照してください。

## 技術スタック

- Next.js 16（App Router）/ React 19 / TypeScript
- Tailwind CSS v4
- Prisma + SQLite（Node.js v20.12 互換のため Prisma は `6.5.0`）

## セットアップ

```bash
npm install
cp .env.example .env   # DATABASE_URL="file:./dev.db"
npx prisma migrate dev
npm run dev
```

http://localhost:3000 を開くとボード一覧画面が表示されます。

## ステップ

| ステップ | ディレクトリ | 内容 |
| --- | --- | --- |
| 1 | [`minimum_handson/1_board_list/`](./minimum_handson/1_board_list/) | プロジェクト初期化 + Prisma/SQLite + ボード一覧・新規作成 |
