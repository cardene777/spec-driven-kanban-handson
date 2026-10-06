# 検索・絞り込み設計（未実装）
## 関連仕様
spec/008_search_filter.md、000〜004、constitution。
## データモデル
関連Card/Label/Assignee/Commentを条件取得、order保持。
## API
GET /api/boards/[boardId]/cards?q=&labelId=&due=&assigneeId=&status=→200 {items:[]}。タイトル/説明/コメント本文を検索、ラベル/期限/担当者/アーカイブ状態で絞込。入力変更→取得→結果/空結果。
仕様入力検証、存在→権限→検証、ステータス404/422、成功は記載値。権限はspec参照。requestIdログ。
## 状態遷移・必要画面状態
検索結果0件は結果がありません。条件は一箇所で保持し組合せをAPIへ渡す。。入力/開閉は画面、永続値はサーバー。取得結果で同期。
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
