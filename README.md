# spec-driven-kanban-handson

Next.js（App Router）+ Prisma + SQLite でカンバンアプリを段階的に作るハンズオンです。

> **このリポジトリのルートには実装コードを置きません。**
> ルートは説明（このファイル）のみで、実際のコードはすべて
> [`minimum_handson/`](./minimum_handson/) 配下に、**部（part）→ 章（chapter）** の
> ディレクトリ構成で置いています。

## 全体構成（2部・5章）

ハンズオンは大きく **2部・5章** に分かれます。
各章のディレクトリには、**その章まで進めた時点のコード全体**（累積スナップショット）が入っており、
そのディレクトリだけをコピーすれば単体で動作します。

```
minimum_handson/
├── README.md              ← 進め方・章一覧
├── part1_基礎/
│   ├── README.md
│   ├── 1_board_list/      ← Step 1 のコード一式（実装済み）
│   └── 2_board_detail/    ← Step 2 のコード一式（実装済み）
└── part2_応用/
    └── README.md          ← 以降の章（順次追加）
```

詳細は [`minimum_handson/README.md`](./minimum_handson/README.md) を参照してください。

## 技術スタック

- Next.js 16（App Router）/ React 19 / TypeScript
- Tailwind CSS v4
- Prisma + SQLite（Node.js v20.12 互換のため Prisma は `6.5.0`）

## 章の動かし方

各章のディレクトリに移動して、次を実行します（章共通）:

```bash
cd minimum_handson/part1_基礎/1_board_list
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

http://localhost:3000 を開くと、その章の画面が表示されます。
