# Step 2: ボード詳細画面とリスト作成

書籍 第 2 章「プロンプトのみで開発する」ステップ 2 完了時点のスナップショット。 Step 1 の全機能に List モデルとボード詳細画面を追加した状態。

## このステップで追加したもの

- `prisma/schema.prisma` に `List` モデル (`id` / `title` / `order` / `boardId` + `Board` へ Cascade)
- 追加マイグレーション `prisma/migrations/20260711093024_add_list_model/`
- `app/api/boards/[id]/lists/route.ts` = GET (`order` 昇順) / POST (`order` 自動採番、 空 title 400、 未知 boardId 404)
- `app/boards/[id]/page.tsx` = ボード詳細 Server Component (params の `await` に対応、 board + lists を Prisma include で 1 query 取得、 未存在は `notFound()`)
- `app/_components/NewListForm.tsx` = 「リスト作成」 ボタン + フォーム + POST + `router.refresh()`
- `app/page.tsx` のボード item を `Link` で `/boards/[id]` に遷移可能に更新

## 動作確認結果

- POST 3 件 (「ToDo」「進行中」「Done」) → 201 (`order` = 0, 1, 2 で採番)
- POST 空 title → 400 `{"error":"title is required"}`
- POST 未知 boardId → 404
- GET → `order` 昇順で 3 件
- ボード詳細 SSR = 200 (未知 boardId は 404 で `notFound()`)
- `tsc --noEmit` pass

## 補足

- Step 1 の状態を保ったまま List を追加する差分開発
- `.env` / `dev.db` / `node_modules` は snapshot から除外
