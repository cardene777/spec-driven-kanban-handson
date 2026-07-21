# Auth Invite Permissions Design Input

認証、メンバー招待、権限管理の設計を書くための入力です。

## 読み込むファイル

- constitution.md
- spec/000_shared_rules.md
- spec/011_auth.md
- spec/012_member_invite.md
- spec/013_permissions.md

## 作成するファイル

- design/011_auth.md
- design/012_member_invite.md
- design/013_permissions.md

## 設計に含めるもの

- データモデル
- API
- 状態遷移
- 権限チェック
- ログ方針
- テスト方針
- 実装順序

## 出力ルール

- 指定した3ファイルだけを作成または更新する
- データモデル、API、状態遷移、権限チェック、ログ方針、テスト方針、実装順序を機能ごとに分けて書く
- セキュリティ上の判断が必要な場合は、未決事項として分けて質問する
- 作成または更新したファイル一覧を最後に示す
