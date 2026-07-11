# Simple 2: /spec スキル

書籍 第 2 章「簡易スキルで仕様駆動する」の /spec 呼び出し完了時点のスナップショット。

## このステップで追加したもの

- `spec/001_boards.md` = ボード一覧 / 新規作成 / GET・POST `/api/boards`
- `spec/002_lists.md` = ボード詳細 / リスト作成 / GET・POST `/api/boards/[id]/lists`
- `spec/003_cards.md` = カード追加とリスト内表示 / GET・POST `/api/lists/[id]/cards`
- `spec/004_card_edit.md` = カードタイトルのインライン編集 / PATCH `/api/cards/[id]`
- `spec/005_shared_rules.md` = 共通ルール (エラー形式 / trim / 404 / order 採番 / データモデル)

## 選択した回答 (書籍本文と同じ)

- エラー形式 = `{ "error": { "code": "...", "message": "..." } }`
- 空白文字のみのタイトル = trim して空ならエラー

## 構造ポイント

- 共通ルール (005) を先に固定、 001-004 は共通ルールを参照して機能固有の差分のみ書く
- 各 file に「機能要件 / 異常系 / 境界条件 / バリデーション / 参考」 の 5 セクション
- 404 と 400 の同時発生ケースは「404 を優先」 と 002-004 で明記
- カード編集で更新可能なのは title のみ (description / order / listId は本 spec 対象外)

## 補足

subprocess 非対話モードで実行したため AskUserQuestion は発火せず (0 件)、 pre-fill で回答を渡した。 書籍本文 line 348-378 の TUI 選択画面は user 手動実行時のみ表示される。
