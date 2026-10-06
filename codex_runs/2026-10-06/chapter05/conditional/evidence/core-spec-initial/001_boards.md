# Boardの仕様
## 概要
初期Board CRUD。
## 既存仕様との関係
000_shared_rulesとconstitutionを参照。初期削除は物理削除。親削除は子をcascade。
## 対象データ
id:string, title:string, order:int, createdAt:datetime, updatedAt:datetime
## 機能要件
### 操作: 作成
親の存在確認後、末尾orderで作成。
### 操作: 表示
order昇順。0件は空状態。詳細不存在404。
### 操作: 編集
titleを更新。Cardはdescriptionも更新。Boardのorderは作成・削除時にサーバーが管理し、編集入力には含めない。
### 操作: 削除
対象と子を物理削除、残った同親のorderを再採番。
## 画面
`/`に一覧、作成フォーム、詳細リンク。`/boards/[id]`にボード名編集・削除。 読込中・失敗・保存中の状態を区別する。
## API
| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/boards | 一覧200 | viewer以上 |
| POST | /api/boards | 作成201 | owner |
| GET | /api/boards/[id] | 詳細200 | viewer以上 |
| PATCH | /api/boards/[id] | 編集200（title） | owner |
| DELETE | /api/boards/[id] | 削除204 | owner |
## 受入条件
- [ ] 001-AC-001 作成201、末尾order、日時とIDを返す。
- [ ] 001-AC-002 一覧200、itemsがorder昇順、0件は空配列。
- [ ] 001-AC-003 編集200、保存値が次回取得と一致する。
- [ ] 001-AC-004 削除204、次の詳細取得404、子も削除。
- [ ] 001-AC-005 空titleと101文字titleは422 fields.title、1文字と100文字は成功。
- [ ] 001-AC-006 存在しない対象は404。
- [ ] 001-AC-007 作成・削除後のBoard orderは0始まり連番を維持する。
- [ ] 001-AC-008 上記画面操作と空状態を表示する。
## 異常系
共通エラー参照。不正JSON422。親不存在404。想定外500。
## 境界条件
0件/1件、先頭末尾、titleの1/100文字。Card説明0/2000文字。
## バリデーション
title必須string、1〜100文字。Card.descriptionはstring、0〜2000文字、省略作成時は空文字。titleの空文字だけ422。orderは整数。
## 権限境界
| 操作 | 必要権限 | 異常時 |
|---|---|---|
| 閲覧 | viewer以上 | 401/403/非閲覧404 |
| 書込 | owner | 401/403 |
初期実装は認証・認可を実装せず常時通過。ロール依存テストは対象外。
## 非機能要件
constitutionの設計目標・ログ・エラー形式を参照。
## 使用する用語
Board（constitution用語集）。
## 参照する既存ファイル
constitution.md、spec/000_shared_rules.md、inputs/001_core_kanban_spec_input.md
## 未決事項
なし。
