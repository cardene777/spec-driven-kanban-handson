# ステップ2: ボード詳細ページ + リスト作成

このステップまでの完成コードのスナップショットです（ソースのみ。生成物は含みません）。
ステップ1（ボード一覧 + 作成）の内容をすべて含みます。

## このステップで追加するもの

- Prisma に `List` モデルを追加（`id` / `title` / `order` / `boardId`、`Board` と 1..N）
- ボード詳細ページ `app/boards/[id]/page.tsx`
  - URL のボード ID からボード情報とリスト一覧を取得して表示
  - リストは同じボード内で `order` の昇順に並べる
  - 「リスト作成」ボタンでフォームを表示し、タイトルを入力・送信すると作成 → 一覧に反映
- API ルート `app/api/boards/[id]/lists/route.ts`
  - `GET /api/boards/[id]/lists` … 指定ボードのリストを `order` 昇順で返す
  - `POST /api/boards/[id]/lists` … `title` を受け取り作成（`order` は末尾に自動採番、`title` 必須で空は 400、存在しないボードは 404）
- ボード一覧（`app/page.tsx`）の各ボードを詳細ページへのリンクに変更

## 主なファイル

| ファイル | 役割 |
| --- | --- |
| `prisma/schema.prisma` | `Board` / `List` モデルの定義 |
| `app/api/boards/[id]/lists/route.ts` | `GET` / `POST /api/boards/[id]/lists` |
| `app/boards/[id]/page.tsx` | ボード詳細（サーバーコンポーネントでボード + リストを取得） |
| `app/boards/[id]/new-list-form.tsx` | リスト作成フォーム（クライアントコンポーネント） |

> Next.js 16 では動的ルートの `params` は `Promise` で渡されるため、`await params` で取り出しています。

## 動かし方

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

http://localhost:3000 でボード一覧を開き、ボードをクリックすると詳細ページに移動します。
