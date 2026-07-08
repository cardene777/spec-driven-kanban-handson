# ステップ4: カードタイトルのインライン編集

このステップまでの完成コードのスナップショットです（ソースのみ。生成物は含みません）。
ステップ1〜3（ボード一覧 / ボード詳細 + リスト作成 / カード追加）の内容をすべて含みます。

## このステップで追加するもの

- API ルート `app/api/cards/[id]/route.ts`
  - `PATCH /api/cards/[id]` … カードのタイトルを更新（`title` 必須で空は 400、存在しないカードは 404）
- カードタイトルのインライン編集（`app/boards/[id]/card-title.tsx`、クライアント）
  - タイトルをクリックすると入力欄に切り替わる
  - **フォーカスを外す（onBlur）と自動で保存**する（Enter でも保存、Escape で取り消し）
  - 変更なし・空文字のときは保存せず元の表示に戻す
  - 保存後は `router.refresh()` で最新状態を反映
- ボード詳細ページ（`app/boards/[id]/page.tsx`）でカードタイトルを `CardTitle` に置き換え

## 主なファイル

| ファイル | 役割 |
| --- | --- |
| `app/api/cards/[id]/route.ts` | `PATCH /api/cards/[id]`（タイトル更新） |
| `app/boards/[id]/card-title.tsx` | インライン編集（クリック → 入力 → onBlur 保存） |
| `app/boards/[id]/page.tsx` | ボード詳細（カードタイトルを編集可能に） |

> このステップは Prisma スキーマの変更はありません（`Card.title` を更新するだけ）。

## 動かし方

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

http://localhost:3000 でボードを開き、カードのタイトルをクリックして編集 → フォーカスを外すと保存されます。
