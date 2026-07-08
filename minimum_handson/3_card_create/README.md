# ステップ3: リスト内にカード追加

このステップまでの完成コードのスナップショットです（ソースのみ。生成物は含みません）。
ステップ1（ボード一覧 + 作成）・ステップ2（ボード詳細 + リスト作成）の内容をすべて含みます。

## このステップで追加するもの

- Prisma に `Card` モデルを追加（`id` / `title` / `description?` / `order` / `listId`、`List` と 1..N）
  - `description` は省略可能（`String?`）
- API ルート `app/api/lists/[id]/cards/route.ts`
  - `GET /api/lists/[id]/cards` … 指定リストのカードを `order` 昇順で返す
  - `POST /api/lists/[id]/cards` … `title`(必須) と `description`(任意) で作成。`order` は末尾に自動採番。存在しないリストは 404、空 `title` は 400。
- ボード詳細ページ（`app/boards/[id]/page.tsx`）で各リスト内のカードを `order` 昇順で表示
- 各リストの末尾に「カード追加」ボタン → フォーム（`app/boards/[id]/new-card-form.tsx`、クライアント）
  - 作成後は `router.refresh()` でリスト末尾に追加されて見える

## 主なファイル

| ファイル | 役割 |
| --- | --- |
| `prisma/schema.prisma` | `Board` / `List` / `Card` モデルの定義 |
| `app/api/lists/[id]/cards/route.ts` | `GET` / `POST /api/lists/[id]/cards` |
| `app/boards/[id]/page.tsx` | ボード詳細（リスト + カードを order 昇順で表示） |
| `app/boards/[id]/new-card-form.tsx` | カード追加フォーム（クライアントコンポーネント） |

## 動かし方

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

http://localhost:3000 でボードを開き、リスト末尾の「カード追加」からカードを追加できます。
