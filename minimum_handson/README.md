# minimum_handson（教材 第2章）

カンバンアプリを**少しずつ作り上げていくハンズオン**（教材 第2章分）です。

## 運用モデル

- **この `minimum_handson/` 直下が「常に最新の稼働アプリ」**です。
  作業と動作確認はここで行い、`node_modules` と `prisma/dev.db` を置きっぱなしにします。
  → **データが保持され**、`npm run dev` の起動も速い。
- **各ステップの成果は、その時点のソースを `1_...` / `2_...` にコピーしたスナップショット**です。
  読み手はステップのディレクトリを開けば、そこまでの完成コードを確認できます（各ステップは前の内容を含む累積コピー）。
- 新しいステップが終わったら、直下の最新アプリを次の番号のディレクトリへコピーして残します。

```
minimum_handson/
├── README.md
├── app/ lib/ prisma/ package.json ...  ← ★ 直下 = 常に最新の稼働アプリ（ここで作業）
├── 1_board_list/                        ← 各ステップのスナップショット（コピー）
├── 2_board_detail/
├── 3_card_create/
└── 4_xxx/
```

（教材 第5章分は別ディレクトリ [`../main_handson/`](../main_handson/) にあります。）

## 一覧

| ステップ | ディレクトリ | 内容 | 状態 |
| --- | --- | --- | --- |
| 1 | [`1_board_list/`](./1_board_list/) | ボード一覧画面 + ボード作成（Next.js App Router + Prisma/SQLite、`GET`/`POST /api/boards`） | 完了 |
| 2 | [`2_board_detail/`](./2_board_detail/) | ボード詳細ページ + リスト作成（`List` モデル追加、`order` 昇順、`GET`/`POST /api/boards/[id]/lists`） | 完了 |
| 3 | [`3_card_create/`](./3_card_create/) | リスト内にカード追加（`Card` モデル追加、`description` 任意、`order` 昇順、`GET`/`POST /api/lists/[id]/cards`） | 完了 |

## 技術スタック

- Next.js 16（App Router）/ React 19 / TypeScript
- Tailwind CSS v4
- Prisma + SQLite（Node.js v20.12 互換のため Prisma は `6.5.0`）

## 動かし方

`minimum_handson/` 直下で:

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

1. 稼働アプリ（`minimum_handson/` 直下）で機能を実装し、`npm run dev` で確認する。
2. 完成したら、その時点のソースを次の番号のディレクトリへコピーしてスナップショットにする。

```bash
# minimum_handson/ 直下で実行（生成物と既存スナップショットを除外）
rsync -a \
  --exclude node_modules --exclude .next --exclude .env \
  --exclude 'prisma/dev.db' --exclude 'prisma/dev.db-journal' \
  --exclude next-env.d.ts \
  --exclude '[0-9]*_*/' \
  ./ 4_xxx/

# 注意: 上の '[0-9]*_*/' 除外は Prisma のタイムスタンプ付き migration フォルダも
# 巻き込むため、スナップショット後に migrations を明示コピーで補完する:
rsync -a prisma/migrations/ 4_xxx/prisma/migrations/
```
