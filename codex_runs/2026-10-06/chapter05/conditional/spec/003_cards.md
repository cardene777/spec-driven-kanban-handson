# Cardの仕様
## 概要
初期Card CRUD。
## 既存仕様との関係
000_shared_rulesとconstitutionを参照。初期実装時は物理削除だった。Section 03追加仕様ではDELETEはソフト削除へ変更（未実装）。親削除は子をcascade。
## 対象データ
id:string, title:string, order:int, createdAt:datetime, updatedAt:datetime, listId:string, description:string
## 機能要件
### 操作: 作成
親の存在確認後、末尾orderで作成。
### 操作: 表示
archivedAtとdeletedAtがともにnullのactiveのみ、order昇順。0件は空状態（追加状態未実装）。詳細不存在404。
### 操作: 編集
titleを更新。Cardはdescriptionも更新。order変更は同じ親内のみ。
### 操作: 削除
deletedAt設定、通常一覧から除外し残ったactive orderを再採番（追加仕様・未実装）。
## 画面
`/boards/[id]`に親単位の一覧、作成、題名編集、削除、並び順変更。カードを選択し題名・説明を表示編集するモーダル。Escape閉じる、初期フォーカス、閉じたら起点へ戻す。 読込中・失敗・保存中の状態を区別する。
## API
| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/lists/[listId]/cards | 一覧200 | viewer以上 |
| POST | /api/lists/[listId]/cards | 作成201 | member以上 |
| GET | /api/cards/[id] | 詳細200 | viewer以上 |
| PATCH | /api/cards/[id] | 編集200（title、order、description） | member以上 |
| DELETE | /api/cards/[id] | ソフト削除204（未実装） | member以上 |
## 受入条件
- [ ] 003-AC-001 作成201、末尾order、日時とIDを返す。
- [ ] 003-AC-002 一覧200、itemsがorder昇順、0件は空配列。
- [ ] 003-AC-003 編集200、保存値が次回取得と一致する。
- [ ] 003-AC-004 初期物理削除は204/次の取得404。追加仕様ではDELETE204/active一覧から除外、purge204/取得404。
- [ ] 003-AC-005 空titleと201文字titleは422 fields.title、1文字と200文字は成功。
- [ ] 003-AC-006 存在しない対象または親は404。
- [ ] 003-AC-007 並び順変更は同親内で連番維持。不正なorderは422。
- [ ] 003-AC-008 上記画面操作と空状態を表示する。
- [ ] 003-AC-009 descriptionは空文字・2000文字成功、2001文字422 fields.description。
## 異常系
共通エラー参照。不正JSON422。親不存在404。想定外500。
## 境界条件
0件/1件、先頭末尾、titleの1/200文字。Card説明0/2000文字。
## バリデーション
title必須string、1〜200文字。Card.descriptionはstring、0〜2000文字、省略作成時は空文字。titleの空文字だけ422。orderは整数。
## 権限境界
| 操作 | 必要権限 | 異常時 |
|---|---|---|
| 閲覧 | viewer以上 | 401/403/非閲覧404 |
| 書込 | member以上 | 401/403 |
初期実装は認証・認可を実装せず常時通過。ロール依存テストは対象外。
## 非機能要件
constitutionの設計目標・ログ・エラー形式を参照。
## 使用する用語
Card（constitution用語集）。
## 参照する既存ファイル
constitution.md、spec/000_shared_rules.md、inputs/001_core_kanban_spec_input.md
## 未決事項
なし。

## Section 03統一
archivedAt:datetime|null、deletedAt:datetime|nullを追加。GET一覧の既定active、status=archived/deletedで各状態。ソフト削除member以上、purge ownerのみ。archive/delete排他。通常実装との差分はdesign/004を正とする。初期コードは更新しない。
