# Board設計
## 関連仕様
spec/001_boards.md、spec/000_shared_rules.md、constitution.md
## データモデル
Prisma Board: UUID @id、title String、order Int、createdAt DateTime @default(now)、updatedAt @updatedAt。
## API設計
GET /api/boards → 200 {items:[]} order昇順。POST /api/boards {title} → 201 作成値。GET /api/boards/[boardId] →200 リソース。PATCH /api/boards/[boardId] {title} →200 更新値。DELETE /api/boards/[boardId] →204 物理削除。
各GET入力はpathのみ、書込JSON入力。存在→（権限常時通過）→入力検証。GETはviewer、書込はowner。全APIはrequestId付き操作ログ、例外はエラーログ。404/422/500は共通形式。
## UI構造・状態遷移
仕様画面にAPIを接続。読み込み→空/一覧→編集中→保存→再取得。カード詳細はdialog、保存失敗時は閉じない。
## 非機能の実装方針
一覧order index、SQLite小量。性能目標のみ。共有ログはlib、本文/秘密を記録しない。
## 権限チェックの配置
認証→存在→権限→検証。ただし初期認証/権限は常時通過で401/403はテストしない。
## 監査ログ
CRUD method/path/status/requestId、失敗はerror名。JSON出力。
## 実装方針
lib/core.tsにPrisma処理、lib/http.tsにHTTP共通処理。追加/削除/並替はtransaction。兄弟order全再採番、同時更新は最後に成功した操作を保持。
## テスト方針
仕様FR、404/422、description境界、親内順序、cascadeを実DBで確認。画面はブラウザで操作する。
## 実装順序
1. Prisma/schema migration clientとlib共通処理。
2. APIと永続化テスト。
3. app画面・dialogとブラウザ接続。
## 未決事項
なし。UUID/配置などは仮想読者承認済み通常設計。
