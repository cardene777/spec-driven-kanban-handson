# カード移動・アーカイブ・削除・復元（暫定）
## 機能要件
cardId/sourceListId/targetListId/targetOrderで移動。同リスト・空リスト・先頭・末尾・同位置対応。listId/targetOrderでリスト並替。0以上整数、範囲外422、不存在404。
カード削除APIをdeletedAt設定へ再定義、完全削除は別DELETE /api/cards/[cardId]/purgeで物理削除・復元不可。
## 権限境界
移動/並替/archive/復元/soft-deleteはmember以上、purge owner。閲覧viewer。初期権限は未接続。
## 境界条件
再archive/再restoreと状態相互作用はレビューで確定する。
## バリデーション・異常系
targetOrder不正422、不存在404、将来権限不足403。
## 非機能要件
操作ログrequestId、constitution性能設計目標。並替の同時更新方針は未決。
## 未決事項
既存003物理DELETE/全件GETとの整合。別ボード移動。リストcascade。archiveとdeletedの関係。状態別エラー。復元位置。
