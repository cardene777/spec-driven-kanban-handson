# 第2章: ボード詳細ページ

ボードをクリックすると開く「ボード詳細ページ」を作るステップです。
URL のボード ID からボード情報とリスト一覧を取得して表示し、リストを作成できるようにします。

> このディレクトリには、**このステップ完了時点のコード全体**（Step 1 を含む累積スナップショット）が入っています。
> そのままコピーすれば単体で動作します。

## このステップでやること

- `List` モデル（`id` / `title` / `order` / `boardId`）を Prisma に追加し、マイグレーション
- ボード詳細ページ `app/boards/[id]/page.tsx` を追加
  - URL のボード ID からボードとリスト一覧を取得して表示
  - リストは同じボード内で `order` の昇順に並べる
  - 存在しないボード ID の場合は 404 ページを表示（`notFound()`）
- API `GET /api/boards/[id]/lists`（`order` 昇順）/ `POST /api/boards/[id]/lists`（作成）を実装
- 「リスト作成」フォームからリストを追加できるようにする
- 一覧ページの各ボードから詳細ページへリンク

## セットアップ手順

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

http://localhost:3000 を開き、ボードをクリックすると詳細ページが表示されます。
「リスト作成」からタイトルを入力して送信すると、リストが `order` の末尾に追加されます。

## 主なファイル（Step 1 からの追加・変更）

| パス | 役割 |
| --- | --- |
| `prisma/schema.prisma` | `List` モデルを追加（`Board` に `lists` リレーション） |
| `prisma/migrations/*_add_list/` | `List` テーブルのマイグレーション |
| `app/boards/[id]/page.tsx` | ボード詳細ページ（Server Component、404 対応） |
| `app/boards/[id]/CreateListForm.tsx` | リスト作成フォーム（Client Component） |
| `app/boards/[id]/not-found.tsx` | ボードが存在しない場合の 404 ページ |
| `app/api/boards/[id]/lists/route.ts` | `GET`（一覧・昇順）/ `POST`（作成） |
| `app/page.tsx` | 各ボードから詳細ページへのリンクを追加 |

## 動作確認（API）

```bash
# あるボードにリストを作成
curl -X POST http://localhost:3000/api/boards/<boardId>/lists \
  -H "Content-Type: application/json" \
  -d '{"title":"ToDo"}'

# リスト一覧（order 昇順）
curl http://localhost:3000/api/boards/<boardId>/lists

# 存在しないボード ID は 404
curl -i http://localhost:3000/api/boards/does-not-exist/lists
```

## 補足

- 新しいリストの `order` は「同じボード内の現在の最大 `order` + 1」で採番しています（先頭は 0）。
- `List` は `boardId` に対して `onDelete: Cascade` を設定しているため、
  将来ボードを削除したときに紐づくリストも一緒に削除されます。
