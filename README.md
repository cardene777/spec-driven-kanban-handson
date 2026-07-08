# spec-driven-kanban-handson

Next.js（App Router）+ Prisma + SQLite でカンバンアプリを段階的に作るハンズオンです。

> **このリポジトリのルートには実装コードを置きません。**
> ルートは説明（このファイル）のみで、実際のコードはすべて
> [`minimum_handson/`](./minimum_handson/) 配下に、**章（chapter）→ ステップ** の
> ディレクトリ構成で置いています。

## 全体構成

教材の章ごとに `chapter_2/` `chapter_5/` を用意しています。
**各章ディレクトリの直下が「常に最新の稼働アプリ」**で、作業はここで行います。
各ステップの成果は、その時点のソースを `1_...` / `2_...` にコピーしたスナップショットとして残します。

```
minimum_handson/
├── README.md
├── chapter_2/             ← 教材 第2章
│   ├── app/ prisma/ ...   ← ★ 直下 = 常に最新の稼働アプリ（ここで作業・データ保持）
│   ├── 1_board_list/      ← 各ステップのスナップショット（コピー）
│   ├── 2_board_detail/
│   ├── 3_card_create/
│   └── 4_card_edit/
└── chapter_5/             ← 教材 第5章（今後追加）
```

詳細は [`minimum_handson/README.md`](./minimum_handson/README.md) を参照してください。

## 技術スタック

- Next.js 16（App Router）/ React 19 / TypeScript
- Tailwind CSS v4
- Prisma + SQLite（Node.js v20.12 互換のため Prisma は `6.5.0`）

## 動かし方

稼働アプリのある章ディレクトリ直下で起動します:

```bash
cd minimum_handson/chapter_2
# 初回のみ
npm install
cp .env.example .env
npx prisma migrate dev
# 起動（2回目以降はこれだけ）
npm run dev
```

http://localhost:3000 を開くと最新アプリが表示されます。
DB は直下の `prisma/dev.db` に保持されるので、追加したデータは消えません。
詳細は [`minimum_handson/README.md`](./minimum_handson/README.md) を参照してください。
