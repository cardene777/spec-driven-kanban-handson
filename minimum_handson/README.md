# minimum_handson — ステップ別ハンズオン

カンバンアプリを**少しずつ作り上げていくハンズオン**です。
教材の **章（chapter）** ごとにディレクトリを分けています。

## 運用モデル

- **各章ディレクトリ（例 `chapter_2/`）の直下が「常に最新の稼働アプリ」**です。
  作業と動作確認はここで行い、`node_modules` と `prisma/dev.db` を置きっぱなしにします。
  → **データが保持され**、`npm run dev` の起動も速い。
- **各ステップの成果は、その時点のソースを `1_...` / `2_...` にコピーしたスナップショット**です。
  読み手はステップのディレクトリを開けば、そこまでの完成コードを確認できます（各ステップは前の内容を含む累積コピー）。
- 新しいステップが終わったら、直下の最新アプリを次の番号のディレクトリへコピーして残します。

```
minimum_handson/
├── README.md
├── chapter_2/             ← 教材 第2章
│   ├── app/ lib/ prisma/ package.json ...  ← ★ 直下 = 常に最新の稼働アプリ（ここで作業）
│   ├── 1_board_list/      ← 各ステップのスナップショット（コピー）
│   ├── 2_board_detail/
│   ├── 3_card_create/
│   └── 4_card_edit/
└── chapter_5/             ← 教材 第5章（今後追加）
```

## 一覧（chapter_2 のスナップショット）

| ステップ | ディレクトリ | 内容 | 状態 |
| --- | --- | --- | --- |
| 1 | [`chapter_2/1_board_list/`](./chapter_2/1_board_list/) | プロジェクト初期化 + Prisma/SQLite + ボード一覧・新規作成 | ✅ |
| 2 | [`chapter_2/2_board_detail/`](./chapter_2/2_board_detail/) | ボード詳細ページ + リスト追加・表示（404対応） | ✅ |
| 3 | [`chapter_2/3_card_create/`](./chapter_2/3_card_create/) | リスト内にカードを追加・表示 | ✅ |
| 4 | [`chapter_2/4_card_edit/`](./chapter_2/4_card_edit/) | カードタイトルのインライン編集（PATCH /api/cards/[id]） | ✅ |

> chapter_2 は継続中です。次のステップは `chapter_2/5_...` として保存していきます。

## 動かし方

稼働アプリのある章ディレクトリ（例 `chapter_2/`）直下で:

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

スナップショット（`N_...`）はソースのみで、生成物は含めません:
`node_modules/`・`.next/`・`.env`・`prisma/dev.db`・`next-env.d.ts`。
（`.env.example` は含めます。）

## 新しいステップの進め方

1. 稼働アプリ（章ディレクトリ直下）で機能を実装し、`npm run dev` で確認する。
2. 完成したら、その時点のソースを次の番号のディレクトリへコピーしてスナップショットにする。

```bash
# chapter_2 直下で実行（生成物と既存スナップショットを除外）
rsync -a \
  --exclude node_modules --exclude .next --exclude .env \
  --exclude 'prisma/dev.db' --exclude next-env.d.ts \
  --exclude '[0-9]*_*/' \
  ./ 5_xxx/
```
