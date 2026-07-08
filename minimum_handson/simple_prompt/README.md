# simple_prompt

カンバンアプリを**少しずつ作り上げていくハンズオン**です（プロンプトで進める版）。

## 運用モデル

- **この `simple_prompt/` 直下が「常に最新の稼働アプリ」**です。
  作業と動作確認はここで行い、`node_modules` と `prisma/dev.db` を置きっぱなしにします。
  → **データが保持され**、`npm run dev` の起動も速い。
- **各ステップの成果は、その時点のソースを `1_...` / `2_...` にコピーしたスナップショット**です（累積コピー）。

```
simple_prompt/
├── README.md
├── app/ lib/ prisma/ package.json ...  ← ★ 直下 = 常に最新の稼働アプリ（ここで作業）
├── 1_board_list/                        ← 各ステップのスナップショット（コピー）
├── 2_board_detail/
├── 3_card_create/
└── 4_card_edit/
```

## ステップ一覧

| ステップ | ディレクトリ | 内容 | 状態 |
| --- | --- | --- | --- |
| 1 | [`1_board_list/`](./1_board_list/) | プロジェクト初期化 + Prisma/SQLite + ボード一覧・新規作成 | ✅ |
| 2 | [`2_board_detail/`](./2_board_detail/) | ボード詳細ページ + リスト追加・表示（404対応） | ✅ |
| 3 | [`3_card_create/`](./3_card_create/) | リスト内にカードを追加・表示 | ✅ |
| 4 | [`4_card_edit/`](./4_card_edit/) | カードタイトルのインライン編集（PATCH /api/cards/[id]） | ✅ |

## 動かし方

`simple_prompt/` 直下で:

```bash
# 初回のみ（依存インストール + .env 作成 + DB 作成）
npm install
cp .env.example .env
npx prisma migrate dev

# 起動（2回目以降はこれだけ）
npm run dev
```

http://localhost:3000 を開くと最新アプリが表示されます。DB は直下の `prisma/dev.db` に保持されます
（消さない限りデータは残ります）。

## スナップショットに含めないもの

`node_modules/`・`.next/`・`.env`・`prisma/dev.db`・`next-env.d.ts`（`.env.example` は含めます）。
