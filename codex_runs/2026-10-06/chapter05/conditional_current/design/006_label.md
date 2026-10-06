# ラベル設計（未実装）
## 関連仕様
spec/006_label.md、000〜004、constitution。
## データモデル
Label(id,boardId,name,color)とCardLabel(cardId,labelId)複合キー。
## API
ボード単位CRUD、カード付与/解除。GET/POST /api/boards/[boardId]/labels→200 {items:[]}/201 Label。PATCH/DELETE /api/labels/[labelId]→200/204。POST/DELETE /api/cards/[cardId]/labels/[labelId]→200/204。削除時付与関係を除去。
仕様入力検証、存在→権限→検証、ステータス404/422、成功は記載値。権限はspec参照。requestIdログ。
## 状態遷移・必要画面状態
0件ラベルなし。選択パネル開閉、作成/編集/削除、付与/解除が表示に反映。。入力/開閉は画面、永続値はサーバー。取得結果で同期。
## 権限チェック
member以上編集、viewer以上取得/検索。初期未接続。
## ログ方針
更新操作とエラーにrequestId/対象ID、個人情報本文は含めない。
## テスト方針
仕様FR/境界/0件/権限とAPI、画面操作。未決事項は確定後テストを定義。
## 実装順序
未決条件回答→モデル/migration→API統合テスト→UI接続。今回は実装しない。
## 未決事項
対応specの未決を引継ぐ。部品階層/props/配置はui-designで定義する。
