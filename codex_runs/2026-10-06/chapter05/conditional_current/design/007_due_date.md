# 期限設計（未実装）
## 関連仕様
spec/007_due_date.md、000〜004、constitution。
## データモデル
Card.dueDate nullable String、日付専用で時刻を付けない。
## API
PATCH /api/cards/[cardId]/due-date {dueDate:YYYY-MM-DD|null}→200 Card。設定/変更/解除。dueDateが本日より前なら期限切れ、当日は期限切れでない。
仕様入力検証、存在→権限→検証、ステータス404/422、成功は記載値。権限はspec参照。requestIdログ。
## 状態遷移・必要画面状態
未設定は期限なし。絶対日付表示。相対表現は基準タイムゾーン決定後に今日/明日/3日後を併記。。入力/開閉は画面、永続値はサーバー。取得結果で同期。
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
