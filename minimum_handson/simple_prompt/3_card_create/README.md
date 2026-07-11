# Step 3: リスト内のカード追加と表示

書籍 第 2 章「プロンプトのみで開発する」ステップ 3 完了時点のスナップショット。 Step 2 の全機能に Card モデルとカード追加 UI を追加した状態。

## このステップで追加したもの

- `prisma/schema.prisma` に `Card` モデル (`id` / `title` / `description?` / `order` / `listId` + `List` へ Cascade)
- 追加マイグレーション `prisma/migrations/20260711094323_add_card_model/`
- `app/api/lists/[id]/cards/route.ts` = GET (`order` 昇順) / POST (title 必須、 description 任意、 `order` 自動採番、 未知 listId 404)
- `app/_components/NewCardForm.tsx` = 「+ カード追加」 ボタン → title + description フォーム展開 → POST → `router.refresh()`
- `app/boards/[id]/page.tsx` = list include に `cards: { orderBy: order asc }` を追加、 各リスト内にカード一覧描画 + 末尾に `NewCardForm` 配置

## 動作確認結果

- 3 リスト x 2 カード計 6 件 POST = 201 (`order` が各 listId 内で 0 / 1 に採番)
- GET カード一覧 = `order` 昇順で 2 件
- カード追加後に `router.refresh()` でリスト末尾に反映
- `tsc --noEmit` pass
