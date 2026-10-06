# Board仕様
## 概要・機能要件
boardsの作成・表示・題名編集・削除。
保存値id,title,order,createdAt,updatedAt。
## API
GET /api/boards → 200 {items:[]} order昇順。POST /api/boards {title} → 201 作成値。GET /api/boards/[boardId] →200 リソース。PATCH /api/boards/[boardId] {title} →200 更新値。DELETE /api/boards/[boardId] →204 物理削除。
## 受入条件
- 001-FR1: GETは0件でもitems空配列、order昇順、200。
- 001-FR2: 作成後末尾に追加、201、再取得で保存確認。
- 001-FR3: 編集後再取得で値が保持される。
- 001-FR4: 削除後404、子もcascadeし順序は連番。

## 異常系
対象/親不存在404、不正JSON/入力422、予期しない例外500。
## 境界条件・バリデーション
title文字列1〜100、空文字/超過422。順序は共有ルール。
## 画面状態
/ はボード一覧と作成/編集/削除操作、ボードを選択すると/boards/[boardId]へ。
ロード中/空状態/入力エラー/サーバーエラー表示。
## 権限境界・初期認証認可
ownerは書込、viewer以上は閲覧。初期は常時通過、401/403未実装。削除member以上は著者補足。
## 非機能要件
共通ログ/requestId、性能設計目標をconstitutionから参照。小量SQLite。
## 使用する用語・参考
Board（constitution用語集）、spec/000_shared_rules.md、inputs/001_core_kanban_spec_input.md。
## 未決事項
なし。
