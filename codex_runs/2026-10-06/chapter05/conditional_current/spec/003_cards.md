# Card仕様
## 概要・機能要件
cardsの作成・表示・題名編集・削除。親内の並べ替え。説明編集、カード詳細ダイアログ。
保存値id,listId,title,description,order,createdAt,updatedAt。
## API
GET /api/lists/[listId]/cards → 200 {items:[]} order昇順。POST /api/lists/[listId]/cards {title,description?} → 201 作成値。GET /api/cards/[cardId] →200 リソース。PATCH /api/cards/[cardId] {title,description?,targetOrder?} →200 更新値。DELETE /api/cards/[cardId] →204 ソフト削除（Section03以降の仕様）。
## 受入条件
- 003-FR1: GETは0件でもitems空配列、order昇順、200。
- 003-FR2: 作成後末尾に追加、201、再取得で保存確認。
- 003-FR3: 編集後再取得で値が保持される。
- 003-FR4: 初期の物理削除後404。Section03以降はソフト削除しactiveから除外、GET/purge/復元は004を参照。
- 003-FR5: targetOrderで親内順序が変わり他の親に影響しない。
## 異常系
対象/親不存在404、不正JSON/入力422、予期しない例外500。
## 境界条件・バリデーション
title文字列1〜200、空文字/超過422。description文字列0〜2000（著者補足）、空文字許可、2001以上422。省略時空文字。順序は共有ルール。
## 画面状態
/boards/[boardId]はボード題名、リストとカード、作成/編集/削除/並べ替えを表示。
カードクリック→題名説明ダイアログ、保存→閉じる/再取得。ロード中/空状態/入力エラー/サーバーエラー表示。
## 権限境界・初期認証認可
member以上は書込、viewer以上は閲覧。初期は常時通過、401/403未実装。削除member以上は著者補足。
## 非機能要件
共通ログ/requestId、性能設計目標をconstitutionから参照。小量SQLite。
## 使用する用語・参考
Card（constitution用語集）、spec/000_shared_rules.md、inputs/001_core_kanban_spec_input.md。
## 未決事項
なし。

## Section03確定差分
CardにarchivedAt/deletedAtを追加。一覧GETはactive既定（共にnull）、status選択可能。削除member以上、purge owner。初期実装は変更していない。
