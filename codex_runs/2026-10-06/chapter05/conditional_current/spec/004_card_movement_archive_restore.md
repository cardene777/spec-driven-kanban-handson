# カード移動・アーカイブ・削除・復元
## 参考
constitution、000〜003、inputs/004。Section03本文の削除/4判断条件を承認。
## 機能要件・受入条件
FR1: activeカードを同リスト並替/同一ボード別リストへ移動。POST /api/cards/[cardId]/move {sourceListId,targetListId,targetOrder}→200更新Card。元/先order再採番。異ボード422。
FR2: PATCH /api/lists/[listId] {targetOrder}→200。親内リスト0始まり連番。
FR3: POST /api/cards/[cardId]/archive→200 archivedAt UTC日時、activeから除外。
FR4: POST /api/cards/[cardId]/restore→200、archive/deleted解除、元list active末尾。既にactiveは状態維持。
FR5: DELETE /api/cards/[cardId]→204 deletedAt UTC日時。ゴミ箱へ。復元可能。
FR6: DELETE /api/cards/[cardId]/purge→204 物理削除、復元不可。削除済みのみ対象。
GET /api/lists/[listId]/cards?status=active|archived|deleted→200 {items:[]}。既定active。active=archivedAt/deletedAt共にnull。
## 状態・画面
active/archive/deletedは排他。archive済soft-delete不可、deleted archive不可。通常ボードはactiveのみ。後続機能は設計のみで画面未実装。
## 異常系・バリデーション
不存在404、targetOrderは0以上整数で挿入可能範囲内、異ボード/非active移動/排他違反/非deleted purgeは422。将来未認証401/不足403。
## 境界条件
空先list index0、先頭0、末尾件数、同位置変更なし。再archiveは日時を保持し200、再restoreはactive維持200。復元後末尾。List削除は全状態cascade物理削除、復元不可。sourceListId不一致422。
## 権限境界
移動/並替/archive/soft-delete/restoreはmember以上、purge owner、閲覧viewer。初期は常時通過。
## 非機能要件
操作ログrequestId、性能目標のみ。transactionで親内再採番、同時更新last-write-wins。
## 未決事項
なし。APIの操作配置と冪等応答はSkillsの通常設計案として承認。新機能は実装しない。
