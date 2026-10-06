# カード状態変更の設計（未実装）
## 関連仕様
spec/004、更新済spec/002/003、spec/000、constitution、初期design/001〜003。
## 前提
Section 03は設計のみ、追加API/状態UIは作らない。初期コードに日時fieldなし。
## データモデル
Card.archivedAt/ deletedAt DateTime?を新規追加（要migration）。排他をAPItransactionで維持。親cascadeを維持。
## API
| 操作 | 入力 | 出力/status | 権限 |
|---|---|---|---|
| POST /api/cards/[id]/move | cardId/sourceListId/targetListId/targetOrder | Card 200、不存在404、別board/非active/不正order422 | member以上 |
| PATCH /api/lists/[id] | listId/targetOrder | List 200/404/422 | member以上 |
| POST /api/cards/[id]/archive | path id | Card 200、deletedは422 | member以上 |
| DELETE /api/cards/[id] | path id | 204 soft、archivedは422 | member以上 |
| POST /api/cards/[id]/restore | path id | Card 200、既にactiveなら不変 | member以上 |
| DELETE /api/cards/[id]/purge | path id | 204、非deleted422、不存在404 | owner |
| GET /api/lists/[id]/cards | status=active/archived/deleted | {items} 200、不正status422 | viewer以上 |
## データ更新手順
transactionで存在・所属・状態・targetOrderを検証し、移動元/先を取得、対象を除去/挿入、両側を再採番。archive/deleteは時刻設定してactiveから除去。restoreは両時刻nullにし元リストactive末尾、同状態の反復は更新しない。purgeは物理削除。
## 並び順の再計算
lib/ordering.ts純関数（未作成）でid配列を処理、全対象へ0,1,2…を書込。移動先挿入index0〜active件数、同リストは除去後件数まで。List並びもboardId単位。
## 状態遷移
active→archivedまたはdeleted、archived/deleted→active、deleted→purged。archived↔deletedの直接遷移禁止。List削除は全状態Cardをcascade、復元不可。
## 権限チェック
認証→対象存在→権限→検証。初期は認証・権限未接続。非閲覧404、未認証401、権限403は設計のみ。
## UI構造
通常/archived/deleted領域、操作後再取得。HTML5 Drag and Drop API採用（本文方針）、状態表示だけ設計。
## 非機能・ログ
性能は200/300msの設計目標、測定なし。全操作requestId、archive/delete/restoreに対象IDと状態、例外error。入力値や秘密は記録しない。
## 同時更新時の扱い
1transaction、last-write-wins、楽観ロックなし（本文指定）。保存順でactive集合再取得し全再採番。
## テスト方針
将来実DB統合: 移動・0/末尾/同位置・別board422・inactive422・排他・反復・末尾復元・全状態cascade。ロール403はCHAPTER 05対象外。
## 実装順序
将来: migration/ordering→transaction/API→画面→統合テスト。今回はどれも実装しない。
## 既存設計との差分
design/003の物理DELETEはsoftへ、purge別API、一覧はactive既定へ。Cardの日時は新規追加。List並べ替え入力は初期orderからtargetOrderへ変更。先行designは更新せず本004を追加時の正とする。初期コードの成否と混同しない。
## 未決事項
なし。
