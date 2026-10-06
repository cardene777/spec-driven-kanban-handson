# 004 設計（未実装）
## 関連仕様・既存差分
000〜004/constitution。003初期設計の物理DELETE/全件GETを004仕様に合わせ将来変更、003設計本体は編集しない。Card archivedAt/deletedAt nullable DateTime追加。
## API
004記載のmove/archive/restore/soft-delete/purge/status取得。入力/出力/ステータス/権限は004各FRに対応。非active移動422、全状態List cascade。
## データ更新手順
存在→権限→検証→transaction。moveはsource/target同一Board確認し、active集合を取得、除去/挿入、listId変更、両側再採番。archive/deleteは状態排他確認→日時設定→active再採番。復元は元list末尾、再restoreは更新なし。purgeはdeleted確認→物理削除。
## 並び順再計算
order昇順/idタイブレークで0,1,…再採番。targetOrderは挿入index。少量データで全兄弟更新。
## 権限チェック
認証→存在→権限→入力。member以上操作、owner purge。初期権限未接続、403確認対象外。
## 同時更新時の扱い
SQLite transactionで一まとまり、成功順last-write-wins、楽観ロックなし。
## UI構造
HTML5 Drag and Drop API案、キーボードの順序ボタン併用。通常/アーカイブ/ゴミ箱の状態表示。実装対象外。
## ログ
archive/delete/restore/purge/move requestId/対象ID/操作/成功失敗。本文値を記録しない。
## テスト方針
空list/先頭/末尾/同位置/別ボード422/状態排他/復元末尾/cascade、初期の403は対象外。未実行。
## 実装順序
schema/migration→並べ替え共通→API統合テスト→UI。今回は設計のみ。
