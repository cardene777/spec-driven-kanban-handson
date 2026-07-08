# spec-driven-kanban-handson

Next.js（App Router）+ Prisma + SQLite でカンバンアプリを段階的に作るハンズオンです。

> **このリポジトリのルートには実装コードを置きません。**
> ルートは説明（このファイル）のみで、実際のコードは各ハンズオンのディレクトリ配下に置いています。

## 全体構成

ハンズオン（＝稼働アプリを直下に持つ末端ディレクトリ）を、目的ごとに配置しています。
関連するものは親ディレクトリでまとめています。

- [`minimum_handson/`](./minimum_handson/) … 進め方別のハンズオンを束ねる親
  - [`simple_prompt/`](./minimum_handson/simple_prompt/) … プロンプトで進める版
  - [`simple_skill/`](./minimum_handson/simple_skill/) … スキルで進める版
- [`main_handson/`](./main_handson/) … ハンズオン（末端）

**各ハンズオン（末端ディレクトリ）の直下が「常に最新の稼働アプリ」**で、作業はここで行います。
各ステップの成果は、その時点のソースを `1_...` / `2_...` にコピーしたスナップショットとして残します。

```
<repo>/
├── README.md
├── minimum_handson/
│   ├── simple_prompt/        ← ハンズオン（末端）
│   │   ├── app/ prisma/ ...  ← ★ 直下 = 常に最新の稼働アプリ（ここで作業・データ保持）
│   │   ├── 1_xxx/            ← 各ステップのスナップショット（コピー）
│   │   └── 2_xxx/
│   └── simple_skill/         ← ハンズオン（末端・同じ構成）
└── main_handson/             ← ハンズオン（末端・同じ構成）
```

詳細は各ディレクトリの README を参照してください。

## 技術スタック

- Next.js 16（App Router）/ React 19 / TypeScript
- Tailwind CSS v4
- Prisma + SQLite（Node.js v20.12 互換のため Prisma は `6.5.0`）

## 動かし方

対象ハンズオン（末端ディレクトリ）直下で起動します:

```bash
cd minimum_handson/simple_prompt   # 対象のハンズオンへ
# 初回のみ
npm install
cp .env.example .env
npx prisma migrate dev
# 起動（2回目以降はこれだけ）
npm run dev
```

http://localhost:3000 を開くと最新アプリが表示されます。
DB は直下の `prisma/dev.db` に保持されるので、追加したデータは消えません。
