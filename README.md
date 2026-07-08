# spec-driven-kanban-handson

Next.js（App Router）+ Prisma + SQLite でカンバンアプリを段階的に作るハンズオンです。

> **このリポジトリのルートには実装コードを置きません。**
> ルートは説明（このファイル）のみで、実際のコードはすべて
> [`minimum_handson/`](./minimum_handson/) 配下に、**章（chapter）→ ステップ** の
> ディレクトリ構成で置いています。

## 全体構成

教材の章ごとに `chapter_2/` `chapter_5/` を用意し、その中を段階的なステップ（`1_...`, `2_...` …）に分けています。
各ステップのディレクトリには、**そのステップまで進めた時点のコード全体**（累積スナップショット）が入っています。

```
minimum_handson/
├── README.md              ← 進め方・一覧
├── chapter_2/             ← 教材 第2章
│   ├── 1_board_list/      ← ボード一覧・作成（実装済み）
│   ├── 2_board_detail/    ← ボード詳細・リスト（実装済み）
│   ├── 3_card_create/     ← カード追加（実装済み）
│   └── 4_card_edit/       ← カードのインライン編集（実装済み）
└── chapter_5/             ← 教材 第5章（今後追加）
```

詳細は [`minimum_handson/README.md`](./minimum_handson/README.md) を参照してください。

## 技術スタック

- Next.js 16（App Router）/ React 19 / TypeScript
- Tailwind CSS v4
- Prisma + SQLite（Node.js v20.12 互換のため Prisma は `6.5.0`）

## 動かし方

対象のステップのディレクトリに移動して、**`npm run dev` だけ**で起動します:

```bash
cd minimum_handson/chapter_2/1_board_list
npm run dev   # 初回は依存インストール〜.env作成〜DBマイグレーションまで自動実行して起動
```

http://localhost:3000 を開くと、その回の画面が表示されます。

DB は全体で共有（`minimum_handson/dev.db`）なので、あるステップで追加したデータは別のステップにも引き継がれます。
詳細は [`minimum_handson/README.md`](./minimum_handson/README.md) を参照してください。
