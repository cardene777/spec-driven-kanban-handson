# minimum_handson — ステップ別ハンズオン

カンバンアプリを**少しずつ作り上げていくハンズオン**を、章ごとのスナップショットとして収めています。
全体は大きく **2ステップ・5章** に分かれます。

## ディレクトリ構成

- 大きな区切りを **ステップ（step）**、その中の各段階を **章（chapter）** とし、
  `stepN_名前/M_名前/` の 2 階層で表現します。
- **各章のディレクトリは、その章まで進めた時点のコード全体（累積スナップショット）**です。
  - 後の章には前の章の内容がすべて含まれ、そのうえでその章の変更が加わっています。
  - つまり読み手は、**ある章のディレクトリを開くだけで、そこまでの完成コード全体**を確認できます。
  - 前の章との差分を見たいときは、隣り合う章ディレクトリを diff で比較してください。

```
minimum_handson/
├── README.md              ← このファイル（進め方・章一覧）
├── step1_基礎/
│   ├── README.md          ← ステップ1の概要
│   ├── 1_board_list/      ← 第1章 完了時点のコード一式
│   │   ├── README.md      ← その章の内容・手順
│   │   ├── app/  lib/  prisma/  ...
│   │   └── .env.example
│   ├── 2_board_detail/    ← 第2章 完了時点のコード一式（第1章を含む）
│   └── 3_card_create/     ← 第3章 完了時点のコード一式（第1・2章を含む）
└── step2_応用/
    ├── README.md          ← ステップ2の概要（章は順次追加）
    └── 4_card_edit/       ← 第4章 完了時点のコード一式（第1〜3章を含む）
```

## 章一覧

| ステップ | 章 | ディレクトリ | 内容 | 状態 |
| --- | --- | --- | --- | --- |
| step1 基礎 | 1 | [`step1_基礎/1_board_list/`](./step1_基礎/1_board_list/) | プロジェクト初期化 + Prisma/SQLite + ボード一覧・新規作成 | ✅ 実装済み |
| step1 基礎 | 2 | [`step1_基礎/2_board_detail/`](./step1_基礎/2_board_detail/) | ボード詳細ページ + リスト追加・表示（404対応） | ✅ 実装済み |
| step1 基礎 | 3 | [`step1_基礎/3_card_create/`](./step1_基礎/3_card_create/) | リスト内にカードを追加・表示 | ✅ 実装済み |
| step2 応用 | 4 | [`step2_応用/4_card_edit/`](./step2_応用/4_card_edit/) | カードタイトルのインライン編集（PATCH /api/cards/[id]） | ✅ 実装済み |
| step2 応用 | 5 | （今後追加） | ドラッグ&ドロップでのカード移動 など | 予定 |

> 第5章以降は未実装です。章の題材・区切りは進行に合わせて調整してください。

## 各章に含めるもの / 含めないもの

各章のディレクトリには、**そのまま動かせるソース一式**を置きます。
生成物や環境依存のファイルは含めません（各自のマシンで再生成します）。

| 含める | 含めない（各自で生成） |
| --- | --- |
| `app/` `lib/` `prisma/schema.prisma` `prisma/migrations/` | `node_modules/`（`npm install`） |
| `package.json` `package-lock.json` 各種設定ファイル | `.next/`（ビルド時に生成） |
| `.env.example` | `.env`（`npm run dev` の predev で自動生成） |
| `README.md`（手順書） | `dev.db`（共有 DB `minimum_handson/dev.db`、自動生成） |

## 章の動かし方（共通）

対象の章ディレクトリに移動して、**`npm run dev` だけ**で起動します:

```bash
npm run dev
```

`npm run dev` 実行時に `predev` が次を自動で行います（初回のみ時間がかかります）:

1. `node_modules` が無ければ `npm install`（`postinstall` で Prisma Client も生成）
2. `.env` が無ければ `.env.example` からコピー
3. `prisma migrate deploy` で DB にマイグレーションを適用

つまり手動での `npm install` / `cp .env.example .env` / `npx prisma migrate dev` は不要です。

### データは章をまたいで共有されます

DB は各章ではなく **`minimum_handson/dev.db`（全章で共有）** に保存されます
（各章の `.env.example` で `DATABASE_URL="file:../../../dev.db"` を指定）。
そのため、ある章で追加したボード/リスト/カードは、別の章に移っても引き継がれます。

> 章を単体で切り離して使いたい場合は、その章の `.env`（または `.env.example`）の
> `DATABASE_URL` を `file:./dev.db` に変更すると、その章専用の DB になります。

## 新しい章を追加するとき

直前の章ディレクトリを丸ごと複製してから、その章の変更を加えます（累積スナップショットを維持）。

```bash
# 例: 第3章をベースに第4章を作る
cp -R step1_基礎/3_card_create step2_応用/4_card_move
# 以降 4_card_move/ の中で作業する
```
