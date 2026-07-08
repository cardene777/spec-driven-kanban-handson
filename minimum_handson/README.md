# minimum_handson — ステップ別ハンズオン

カンバンアプリを**少しずつ作り上げていくハンズオン**を、ステップごとのスナップショットとして収めています。
教材の **章（chapter）** ごとにディレクトリを分け、その中を段階的な **ステップ** に分けています。

## ディレクトリ構成

- 教材の章を `chapter_2/` `chapter_5/` のディレクトリで表し、その中の各段階を `M_名前/` のステップで表します。
- **各ステップのディレクトリは、そのステップまで進めた時点のコード全体（累積スナップショット）**です。
  - 後のステップには前のステップの内容がすべて含まれ、そのうえでその回の変更が加わっています。
  - つまり読み手は、**あるステップのディレクトリを開くだけで、そこまでの完成コード全体**を確認できます。
  - 前のステップとの差分を見たいときは、隣り合うステップのディレクトリを diff で比較してください。

```
minimum_handson/
├── README.md              ← このファイル（進め方・一覧）
├── chapter_2/             ← 教材 第2章
│   ├── 1_board_list/      ← 完了時点のコード一式
│   │   ├── README.md      ← その回の内容・手順
│   │   ├── app/  lib/  prisma/  ...
│   │   └── .env.example
│   ├── 2_board_detail/    ← 1 を含む
│   ├── 3_card_create/     ← 1・2 を含む
│   └── 4_card_edit/       ← 1〜3 を含む
└── chapter_5/             ← 教材 第5章（今後追加）
```

## 一覧

| 章 | ステップ | ディレクトリ | 内容 | 状態 |
| --- | --- | --- | --- | --- |
| chapter_2 | 1 | [`chapter_2/1_board_list/`](./chapter_2/1_board_list/) | プロジェクト初期化 + Prisma/SQLite + ボード一覧・新規作成 | ✅ 実装済み |
| chapter_2 | 2 | [`chapter_2/2_board_detail/`](./chapter_2/2_board_detail/) | ボード詳細ページ + リスト追加・表示（404対応） | ✅ 実装済み |
| chapter_2 | 3 | [`chapter_2/3_card_create/`](./chapter_2/3_card_create/) | リスト内にカードを追加・表示 | ✅ 実装済み |
| chapter_2 | 4 | [`chapter_2/4_card_edit/`](./chapter_2/4_card_edit/) | カードタイトルのインライン編集（PATCH /api/cards/[id]） | ✅ 実装済み |
| chapter_5 | - | （今後追加） | （後日） | 予定 |

> chapter_2 は継続中です。次のステップも `chapter_2/` に追加していきます。

## 各ステップに含めるもの / 含めないもの

各ステップのディレクトリには、**そのまま動かせるソース一式**を置きます。
生成物や環境依存のファイルは含めません（各自のマシンで再生成します）。

| 含める | 含めない（各自で生成） |
| --- | --- |
| `app/` `lib/` `prisma/schema.prisma` `prisma/migrations/` | `node_modules/`（`npm install`） |
| `package.json` `package-lock.json` 各種設定ファイル | `.next/`（ビルド時に生成） |
| `.env.example` | `.env`（`npm run dev` の predev で自動生成） |
| `README.md`（手順書） | `dev.db`（共有 DB `minimum_handson/dev.db`、自動生成） |

## 動かし方（共通）

対象のステップのディレクトリに移動して、**`npm run dev` だけ**で起動します:

```bash
npm run dev
```

`npm run dev` 実行時に `predev` が次を自動で行います（初回のみ時間がかかります）:

1. `node_modules` が無ければ `npm install`（`postinstall` で Prisma Client も生成）
2. `.env` が無ければ `.env.example` からコピー
3. `prisma migrate deploy` で DB にマイグレーションを適用

つまり手動での `npm install` / `cp .env.example .env` / `npx prisma migrate dev` は不要です。

### データはステップをまたいで共有されます

DB は各ステップではなく **`minimum_handson/dev.db`（全体で共有）** に保存されます
（各ステップの `.env.example` で `DATABASE_URL="file:../../../dev.db"` を指定）。
そのため、あるステップで追加したボード/リスト/カードは、別のステップに移っても引き継がれます。

> ステップを単体で切り離して使いたい場合は、その `.env`（または `.env.example`）の
> `DATABASE_URL` を `file:./dev.db` に変更すると、そのステップ専用の DB になります。

## 新しいステップを追加するとき

直前のステップのディレクトリを丸ごと複製してから、その回の変更を加えます（累積スナップショットを維持）。

```bash
# 例: 4_card_edit をベースに次のステップを作る
cp -R chapter_2/4_card_edit chapter_2/5_xxx
# 以降 5_xxx/ の中で作業する
```
