# Assignee Design Input

担当者割り当て機能の設計を書くための入力です。

## 読み込むファイル

- constitution.md
- spec/000_shared_rules.md
- spec/001_boards.md
- spec/002_lists.md
- spec/003_cards.md
- spec/005_card_detail.md
- spec/009_assignee.md

## 作成するファイル

- design/009_assignee.md

## 設計に含めるもの

- API
- データモデル
- 権限チェック
- カード詳細UIとの接続
- テスト方針
- Red-Green-Refactorで扱うFRの順番
- 実装順序

## 出力ルール

- 指定した1ファイルだけを作成または更新する
- API、データモデル、カード詳細UIとの接続、権限チェック、テスト方針、実装順序を分けて書く
- Red-Green-Refactorで扱うFRの順番を明記する
- 既存設計と矛盾しそうな場合は、矛盾箇所と判断点を示してから質問する
- 作成または更新したファイル一覧を最後に示す
