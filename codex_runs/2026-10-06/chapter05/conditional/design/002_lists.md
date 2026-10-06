# Listの設計
## 関連仕様
spec/002_lists.md、spec/000_shared_rules.md、constitution.md、inputs/001_core_kanban_design_input.md
## 前提
初期CRUDのみ。認証・ロール確認なし。Card削除は物理削除。
## データモデル
Prisma SQLite: id:string, title:string, order:int, createdAt:datetime, updatedAt:datetime, boardId:string。id @default(cuid())、createdAt @default(now())、updatedAt @updatedAt。orderは親との複合index。子relationはonDelete Cascade。
## API設計
### GET /api/boards/[boardId]/lists
- 入力: なし
- 出力: {items: List[]}
- ステータス: 200、不存在404、入力不正422、想定外500
- 権限: viewer以上（初期通過）
- ログ: requestId、method、対象ID、status。
### POST /api/boards/[boardId]/lists
- 入力: {title}
- 出力: List
- ステータス: 201、不存在404、入力不正422、想定外500
- 権限: member以上（初期通過）
- ログ: requestId、method、対象ID、status。
### GET /api/lists/[id]
- 入力: path id
- 出力: List
- ステータス: 200、不存在404、入力不正422、想定外500
- 権限: viewer以上（初期通過）
- ログ: requestId、method、対象ID、status。
### PATCH /api/lists/[id]
- 入力: {title?, order?}
- 出力: List
- ステータス: 200、不存在404、入力不正422、想定外500
- 権限: member以上（初期通過）
- ログ: requestId、method、対象ID、status。
### DELETE /api/lists/[id]
- 入力: path id
- 出力: 本文なし
- ステータス: 204、不存在404、入力不正422、想定外500
- 権限: member以上（初期通過）
- ログ: requestId、method、対象ID、status。
## UI構造
client stateで一覧・選択・エラー・保存中を管理。変更後は再取得。Board一覧→詳細、カード選択→詳細dialog。エラーは画面表示、保存中は二重送信を抑止。
## 状態遷移
空→作成→編集→並べ替え→削除。失敗時は保存済みの状態を維持。
## 非機能の実装方針
### 性能
親ID/order indexとローカル少量データ。200/300msは設計目標のみ未測定。
### セキュリティ
認証→存在→権限→検証の位置を明示するが認証権限は接続しない。ログに入力値を含めない。
### 運用
lib/api.tsでrequestIdを作りJSON操作ログ、例外は同IDのエラーログ。
## 権限チェックの配置
Route Handler入口（初期通過）→Prisma存在確認→権限位置（初期通過）→入力検証。
## 監査ログ
全API infoでrequestId/操作/対象ID/status、例外error。
## 実装方針
lib/db.tsのPrisma Client singleton、lib/api.tsで共通エラー、lib/core.tsでトランザクション。親ごとの全再採番、last-write-wins。依存追加を抑えるため手動validation。通常の実装裁量として採用。
## テスト方針
Vitestで実SQLiteのCRUD、境界、404、order、cascade、description。UIはブラウザで操作確認。権限403未実装。
## 実装順序
1. Prismaスキーマ・migration・Clientと共通DB/API/validation。
2. 親Board→List→CardのCRUD/APIとテスト。
3. 一覧/詳細/ダイアログを接続しlint→typecheck→test→build、ブラウザとHTTP確認。
## 未決事項
なし。
