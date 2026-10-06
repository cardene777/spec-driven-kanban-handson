# 共通ルール
constitution.mdとinputs/001_core_kanban_spec_input.md参照。
## エラー
422 {error:validation_error,fields:{field:reason}}、404 {error:not_found}、500 {error:internal_error}。将来401 unauthenticated、403 forbidden。閲覧不可404。
## 権限
閲覧viewer以上、Board書込owner、List/Card書込member以上（削除含む著者補足）。初期は認証→存在→権限→検証の位置のみ設計、認証/権限は常時通過、ロールは解決しない。
## order/ID/日付
UUID文字列。orderは親内0始まり連番、追加末尾、削除・移動でトランザクション内再採番。targetOrderは0〜件数-1整数、範囲外422。日時UTC ISO。
## ログ
全APIでrequestId発行し応答ヘッダーに付与。操作/エラーをJSON構造ログでstdout/stderr記録、本文は記録しない。
## 未決事項
なし。性能は一覧200ms/書込300msの設計目標、測定対象外。
