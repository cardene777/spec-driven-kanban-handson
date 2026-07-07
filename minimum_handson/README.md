# minimum_handson — ステップ別ハンズオン

このディレクトリには、カンバンアプリを**少しずつ作り上げていくハンズオン**を、
ステップごとのスナップショットとして収めています。

## 構成の考え方

- ステップごとに `1_xxx` / `2_xxx` … というディレクトリを用意します。
- **各ディレクトリは、そのステップ完了時点のコード全体（累積スナップショット）**です。
  - `2_xxx` には `1_xxx` の内容がすべて含まれ、そのうえで Step 2 の変更が加わっています。
  - つまり読み手は、**あるステップのディレクトリを開くだけで、そこまでの完成コード全体**を確認できます。
  - 前のステップとの差分を知りたい場合は、隣り合うディレクトリを diff で比較してください。

```
minimum_handson/
├── README.md            ← このファイル（全体の説明）
├── 1_board_list/        ← Step 1 完了時点のコード一式
│   ├── README.md        ← そのステップの内容・手順
│   ├── app/
│   ├── lib/
│   ├── prisma/
│   └── ...
└── 2_xxx/               ← Step 2 完了時点のコード一式（Step 1 を含む）
    └── ...
```

## 各ディレクトリに含めるもの / 含めないもの

各ステップのディレクトリには、**そのまま動かせるソース一式**を置きます。
生成物や環境依存のファイルは含めません（各自のマシンで再生成します）。

| 含める | 含めない（各自で生成） |
| --- | --- |
| `app/` `lib/` `prisma/schema.prisma` `prisma/migrations/` | `node_modules/`（`npm install`） |
| `package.json` `package-lock.json` 各種設定ファイル | `.next/`（ビルド時に生成） |
| `.env.example` | `.env`（`cp .env.example .env`） |
| `README.md`（手順書） | `prisma/dev.db`（`npx prisma migrate dev` で生成） |

## 各ステップの動かし方

いずれのステップも共通です。対象ディレクトリに移動して:

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

## ステップ一覧

| ステップ | ディレクトリ | 内容 |
| --- | --- | --- |
| 1 | [`1_board_list/`](./1_board_list/) | プロジェクト初期化 + Prisma/SQLite + ボード一覧・新規作成 |

> ステップが増えたら、この表と上のツリーに追記していきます。
