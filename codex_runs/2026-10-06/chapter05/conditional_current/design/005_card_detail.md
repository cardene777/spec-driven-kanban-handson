# カード詳細設計（未実装）
## 関連仕様
spec/005_card_detail.md、000〜004、constitution。
## データモデル
CardにdueDate nullableとlabels/assignees/comments取得関係を追加。
## API
タイトル/説明/ラベル/期限/担当者/コメント/操作領域。クリックで開く、閉じる・保存で閉じる。GET /api/cards/[cardId]→200 {…card,dueDate,labels,assignees,comments}。未設定date=null、ラベル0件=[]。PATCH同pathでtitle/description→200。担当者割当はmember以上、コメント投稿member以上。担当者/コメント領域の詳細は後続009/010を参照。
仕様入力検証、存在→権限→検証、ステータス404/422、成功は記載値。権限はspec参照。requestIdログ。
## 状態遷移・必要画面状態
未設定はラベルなし/期限なし/担当者なし/コメントなし。編集入力保持、保存中重複送信抑止、失敗は開いたままエラー。。入力/開閉は画面、永続値はサーバー。取得結果で同期。
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
