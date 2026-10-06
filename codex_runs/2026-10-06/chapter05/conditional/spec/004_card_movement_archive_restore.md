# カード移動・アーカイブ・削除・復元の仕様（レビュー後・未実装）
## 概要
初期実装への追加仕様。実装は本節対象外。
## 既存仕様との関係
spec/003の物理DELETEをソフトDELETEへ変更し、owner専用purgeを追加する差分。003本体は本文の承認後に更新した。
## 対象データ
CardにarchivedAt:datetime|null、deletedAt:datetime|nullを追加。初期実装に存在しない（未実装）。
## 機能要件
### 操作: カード移動
activeカードをcardId/sourceListId/targetListId/targetOrderで同一ボード内の同リストまたは別リストへ移動。別ボード422、inactive移動422。元と先のorderを再計算。
### 操作: リスト並べ替え
listId/targetOrderを受け取り同ボード内で再計算。
### 操作: アーカイブ
archivedAt設定、通常一覧から除外。
### 操作: ソフト削除
deletedAt設定、ゴミ箱へ。
### 操作: 復元
archivedAt/deletedAtをnullへ、元のリストのactive末尾。
### 操作: 完全削除
削除済みを物理削除、復元不可。
## 画面
active一覧、archived一覧、deleted一覧。ボード詳細は両日時nullのみ。ドラッグ&ドロップで移動・並べ替え。機能設計のみ。
## API
POST /api/cards/[id]/move: cardId/sourceListId/targetListId/targetOrder、200 Card。
PATCH /api/lists/[id]: targetOrder、200 List。
POST /api/cards/[id]/archive、POST /api/cards/[id]/restore: 200 Card。
DELETE /api/cards/[id]: 204ソフト削除。
DELETE /api/cards/[id]/purge: 204完全削除。
GET /api/lists/[id]/cards?status=active|archived|deleted: 200 {items:Card[]}、既定active。
## 受入条件
- [ ] 移動後listIdと両リストorderが一致し、0始まり連番になる。
- [ ] 空リスト先頭0、末尾、同位置の移動が成功する。
- [ ] archive/delete後通常一覧から消え、restore後末尾に戻る。
- [ ] purge後取得404、復元できない。
- [ ] 不存在ID404、不正なtargetOrder422。
## 異常系
不存在404、入力不正422、権限403は初期通過。
## 境界条件
空/先頭/末尾/同位置。同状態の反復archive/restoreは成功で値不変。deletedからarchive、archivedからsoft-deleteは422。archiveとsoft-deleteは排他。
## バリデーション
targetOrderは0以上の整数、移動先のactive件数以下。移動元listId一致を検証。
## 権限境界
move/archive/restore/リスト並べ替え/ソフト削除member以上、purge ownerのみ、閲覧viewer以上。初期権限確認は未接続。
## 非機能要件
性能目標のみ。archive/delete/restore操作ログ、requestId。更新transaction、last-write-wins（本文指定）。
## 使用する用語
Card、List、Archive、Restore（constitution参照）。
## 参照する既存ファイル
constitution.md、spec/000_shared_rules.md、spec/001_boards.md、spec/002_lists.md、spec/003_cards.md、inputs/004_card_movement_archive_restore_spec_input.md
## 未決事項
なし。仕様/設計のみ。初期コードは変更しない。

## レビューで確定した条件
List削除は通常/archived/deletedすべてのCardを物理cascadeし復元不可。archiveとsoft-deleteは排他。deletedからrestoreは元のリストactive末尾。purgeはdeletedのみ、ownerのみ。
