# Step 4: カードタイトルのインライン編集

書籍 第 2 章「プロンプトのみで開発する」ステップ 4 完了時点のスナップショット。 Step 3 の全機能に PATCH API と CardTitle client component を追加した状態。 プロンプトのみで作る 4 ステップの最終形。

## このステップで追加したもの

- `app/api/cards/[id]/route.ts` = `PATCH` handler (title trim → 空なら 400、 存在チェック → 未知 id 404、 変更なしは実 update スキップ)
- `app/_components/CardTitle.tsx` = client component。 title を click で `<input>` に切替、 全選択、 blur で `PATCH /api/cards/[id]` 送信、 Enter で blur 発火、 Escape で編集破棄、 成功時 `router.refresh()`
- `app/boards/[id]/page.tsx` = 従来の `<p>{card.title}</p>` を `<CardTitle>` に置換

## 動作確認結果

- PATCH `/api/cards/{id}` (title = "要件を再確認") = 200 で更新反映
- 編集後 reload しても新 title が残る
- Enter / Escape / 空文字 / 変更なしの 4 case を client 側で分岐
- `tsc --noEmit` pass

## プロンプトのみでの最終形

- Prisma = Board / List / Card 3 モデル
- API = GET / POST /api/boards + POST /api/boards/[id]/lists + POST /api/lists/[id]/cards + PATCH /api/cards/[id]
- 画面 = ボード一覧 (`/`) + ボード詳細 (`/boards/[id]`)
- UI Components = NewBoardForm / NewListForm / NewCardForm / CardTitle

書籍本文で提起される「入力検証の基準」「並び順の採番方針」「未決定の設計判断」「共通ルールの散在」 の 4 問題は、 このスナップショットのコードを比較資料として、 次章 (`simple_skill/`) の仕様駆動版と対比する。
