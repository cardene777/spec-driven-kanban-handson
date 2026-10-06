# List仕様
## 概要・機能要件
listsの作成・表示・題名編集・削除。親内の並べ替え。
保存値id,boardId,title,order,createdAt,updatedAt。
## API
GET /api/boards/[boardId]/lists → 200 {items:[]} order昇順。POST /api/boards/[boardId]/lists {title} → 201 作成値。GET /api/lists/[listId] →200 リソース。PATCH /api/lists/[listId] {title,targetOrder?} →200 更新値。DELETE /api/lists/[listId] →204 物理削除。
## 受入条件
- 002-FR1: GETは0件でもitems空配列、order昇順、200。
- 002-FR2: 作成後末尾に追加、201、再取得で保存確認。
- 002-FR3: 編集後再取得で値が保持される。
- 002-FR4: 削除後404、子もcascadeし順序は連番。
- 002-FR5: targetOrderで親内順序が変わり他の親に影響しない。
## 異常系
対象/親不存在404、不正JSON/入力422、予期しない例外500。
## 境界条件・バリデーション
title文字列1〜100、空文字/超過422。順序は共有ルール。
## 画面状態
/boards/[boardId]はボード題名、リストとカード、作成/編集/削除/並べ替えを表示。
ロード中/空状態/入力エラー/サーバーエラー表示。
## 権限境界・初期認証認可
member以上は書込、viewer以上は閲覧。初期は常時通過、401/403未実装。削除member以上は著者補足。
## 非機能要件
共通ログ/requestId、性能設計目標をconstitutionから参照。小量SQLite。
## 使用する用語・参考
List（constitution用語集）、spec/000_shared_rules.md、inputs/001_core_kanban_spec_input.md。
## 未決事項
なし。

## Section03確定差分
List削除はactive/archive/deleted全Cardを物理cascade。復元不可。順序再採番。
