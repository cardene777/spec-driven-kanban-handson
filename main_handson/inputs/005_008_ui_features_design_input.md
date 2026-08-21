# UI Feature Design Input

カード詳細、ラベル、期限、検索、絞り込みのアプリケーション設計を書くための入力です。
この入力にはAtomなどの分類、部品名、props、配置パスを含めません。画面状態と必要な操作だけを記録し、UI部品の階層は`/ui-design`で扱います。

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
- 仕様にない操作は設計だけで追加しない
- 既存設計と矛盾する可能性がある場合は、矛盾する条件を挙げ、どちらを採用するか質問する
- 完了時に、作成または更新したファイルを一覧で報告する
