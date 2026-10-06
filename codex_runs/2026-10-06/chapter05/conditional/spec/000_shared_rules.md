# 共通ルール
## エラー形式
422 validation_errorはfieldsを含む。他は{error: エラー名}。不存在404 not_found、想定外500 internal_error。認証401、権限403は設計上のみ。
## 権限ロール
閲覧viewer以上、Board書込owner、List/Card書込と削除member以上。初期APIでは認証・権限を通過する前提。User/Membership/セッションは実装しない。
## order規則
親単位の0始まり連番。作成は末尾。並べ替えの位置は整数0〜件数-1（初期PATCHのbodyはorder。Section03追加仕様のbodyはtargetOrder）、範囲外422。削除後は再採番。更新はトランザクション。
## ID規則
cuid文字列。存在しないIDは404。IDの形式だけで422にはしない。
## ログ方針
全APIでrequestIdを発行、応答ヘッダx-request-id、構造化JSONで操作・対象ID・ステータス。入力本文は記録しない。エラーも同じID。
## 日付方針
UTC ISO 8601文字列。createdAt不変、updatedAt更新時変更。
## 共通応答
一覧は{items: [...]}、詳細・作成・更新は対象オブジェクト、削除204。認証→存在→権限→入力検証。初期は認証・権限なし。
## 参照
constitution.md、inputs/001_core_kanban_spec_input.md。性能は設計目標のみ測定対象外。
## 未決事項
なし。
