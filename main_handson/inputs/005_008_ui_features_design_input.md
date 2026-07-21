# UI Feature Design Input

カード詳細、ラベル、期限、検索、絞り込みのアプリケーション設計を書くための入力です。
UI部品の階層設計はここでは書きすぎず、別途ui-designで扱います。

## 読み込むファイル

- constitution.md
- spec/000_shared_rules.md
- spec/001_boards.md
- spec/002_lists.md
- spec/003_cards.md
- spec/004_card_movement_archive_restore.md
- spec/005_card_detail.md
- spec/006_label.md
- spec/007_due_date.md
- spec/008_search_filter.md

## 作成するファイル

- design/005_card_detail.md
- design/006_label.md
- design/007_due_date.md
- design/008_search_filter.md

## 設計に含めるもの

- API
- データモデル
- 状態遷移
- 権限チェック
- ログ方針
- テスト方針
- 必要な画面状態
- 実装順序

## 出力ルール

- 指定した4ファイルだけを作成または更新する
- API、データモデル、状態遷移、権限チェック、ログ方針、テスト方針、実装順序を機能ごとに分けて書く
- UI部品の階層設計は書きすぎず、必要な画面状態だけを整理する
- 既存設計と矛盾しそうな場合は、矛盾箇所と判断点を示してから質問する
- 作成または更新したファイル一覧を最後に示す
