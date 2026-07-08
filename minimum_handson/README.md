# minimum_handson — ステップ別ハンズオン

カンバンアプリを**少しずつ作り上げていくハンズオン**を、章ごとのスナップショットとして収めています。
全体は大きく **2部・5章** に分かれます。

## ディレクトリ構成

- 大きな区切りを **部（part）**、その中の各ステップを **章（chapter）** とし、
  `partN_名前/M_名前/` の 2 階層で表現します。
- **各章のディレクトリは、その章まで進めた時点のコード全体（累積スナップショット）**です。
  - 後の章には前の章の内容がすべて含まれ、そのうえでその章の変更が加わっています。
  - つまり読み手は、**ある章のディレクトリを開くだけで、そこまでの完成コード全体**を確認できます。
  - 前の章との差分を見たいときは、隣り合う章ディレクトリを diff で比較してください。

```
minimum_handson/
├── README.md              ← このファイル（進め方・章一覧）
├── part1_基礎/
│   ├── README.md          ← 第1部の概要
│   ├── 1_board_list/      ← 第1章 完了時点のコード一式
│   │   ├── README.md      ← その章の内容・手順
│   │   ├── app/  lib/  prisma/  ...
│   │   └── .env.example
│   └── 2_board_detail/    ← 第2章 完了時点のコード一式（第1章を含む）
└── part2_応用/
    └── README.md          ← 第2部の概要（章は順次追加）
```

## 章一覧

| 部 | 章 | ディレクトリ | 内容 | 状態 |
| --- | --- | --- | --- | --- |
| 第1部 基礎 | 1 | [`part1_基礎/1_board_list/`](./part1_基礎/1_board_list/) | プロジェクト初期化 + Prisma/SQLite + ボード一覧・新規作成 | ✅ 実装済み |
| 第1部 基礎 | 2 | [`part1_基礎/2_board_detail/`](./part1_基礎/2_board_detail/) | ボード詳細ページ + リスト追加・表示（404対応） | ✅ 実装済み |
| 第2部 応用 | 3 | （今後追加） | カードの追加・表示 | 予定 |
| 第2部 応用 | 4 | （今後追加） | ドラッグ&ドロップでのカード移動 | 予定 |
| 第2部 応用 | 5 | （今後追加） | 編集・削除など仕上げ | 予定 |

> 第2章以降は未実装です。章の題材・区切りは進行に合わせて調整してください。

## 各章に含めるもの / 含めないもの

各章のディレクトリには、**そのまま動かせるソース一式**を置きます。
生成物や環境依存のファイルは含めません（各自のマシンで再生成します）。

| 含める | 含めない（各自で生成） |
| --- | --- |
| `app/` `lib/` `prisma/schema.prisma` `prisma/migrations/` | `node_modules/`（`npm install`） |
| `package.json` `package-lock.json` 各種設定ファイル | `.next/`（ビルド時に生成） |
| `.env.example` | `.env`（`cp .env.example .env`） |
| `README.md`（手順書） | `prisma/dev.db`（`npx prisma migrate dev` で生成） |

## 章の動かし方（共通）

対象の章ディレクトリに移動して:

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

> `npm run dev` は `.env` が無ければ `.env.example` から自動生成します
> （`"dev": "cp -n .env.example .env && next dev"`）。ただし `npx prisma migrate dev`
> の前には `.env` が必要なので、上記の手順どおり先に `cp .env.example .env` を実行してください。

## 新しい章を追加するとき

直前の章ディレクトリを丸ごと複製してから、その章の変更を加えます（累積スナップショットを維持）。

```bash
# 例: 第1章をベースに第2章を作る
cp -R part1_基礎/1_board_list part1_基礎/2_board_detail
# 以降 2_board_detail/ の中で作業する
```
