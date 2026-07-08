# 第3章: リスト内にカードを追加

リストの中に「カード」を追加・表示できるようにするステップです。
各リストの末尾に「カード追加」ボタンを置き、タイトルを入力するとカードが作成されて表示されます。

> このディレクトリには、**このステップ完了時点のコード全体**（Step 1・2 を含む累積スナップショット）が入っています。
> そのままコピーすれば単体で動作します。

## このステップでやること

- `Card` モデル（`id` / `title` / `description?` / `order` / `listId`）を Prisma に追加し、マイグレーション
  - `description` は省略可能（`String?`）
- API `GET /api/lists/[id]/cards`（`order` 昇順）/ `POST /api/lists/[id]/cards`（作成）を実装
- ボード詳細ページで、各リストのカードを `order` の昇順で表示
- リストの末尾に「カード追加」ボタンを置き、押すとタイトル入力フォームが出る
- 作成後、リストの末尾にカードが追加されて見える（`router.refresh()` で再取得）

## セットアップ手順

```bash
npm install   # postinstall で Prisma Client を生成
npm run dev   # predev で .env 生成 + DB マイグレーションを自動実行して起動
```

`npm install` 後は `npm run dev` だけで、`.env` の作成と DB のマイグレーションまで自動で行われます。
DB は全章共有の `minimum_handson/dev.db` に保存されます（データは章をまたいで引き継がれます）。

http://localhost:3000 を開き、ボード → リストの順に用意してから、
リスト内の「+ カード追加」でカードを追加できます。

## 主なファイル（Step 2 からの追加・変更）

| パス | 役割 |
| --- | --- |
| `prisma/schema.prisma` | `Card` モデルを追加（`List` に `cards` リレーション） |
| `prisma/migrations/*_add_card/` | `Card` テーブルのマイグレーション |
| `app/api/lists/[id]/cards/route.ts` | `GET`（一覧・昇順）/ `POST`（作成、`description` 任意） |
| `app/boards/[id]/AddCardForm.tsx` | カード追加フォーム（Client Component） |
| `app/boards/[id]/page.tsx` | 各リストのカード表示と「カード追加」を追加 |

## 動作確認（API）

```bash
# あるリストにカードを作成（description は任意）
curl -X POST http://localhost:3000/api/lists/<listId>/cards \
  -H "Content-Type: application/json" \
  -d '{"title":"設計する"}'
curl -X POST http://localhost:3000/api/lists/<listId>/cards \
  -H "Content-Type: application/json" \
  -d '{"title":"実装する","description":"APIとUI"}'

# カード一覧（order 昇順）
curl http://localhost:3000/api/lists/<listId>/cards

# 存在しないリスト ID は 404
curl -i http://localhost:3000/api/lists/does-not-exist/cards
```

## 補足

- 新しいカードの `order` は「同じリスト内の現在の最大 `order` + 1」で採番しています（先頭は 0）。
- `description` は省略時・空文字時は `null` として保存します。
- カード追加フォームは Enter で送信、Shift+Enter で改行できます。作成後もフォームは開いたままで、
  続けて複数のカードを追加できます。
