# Core Kanban Spec Input

新しいカンバンアプリの最初の仕様を書くための入力です。
空のプロジェクトから作ります。

## 作成するファイル

- spec/000_shared_rules.md
- spec/001_boards.md
- spec/002_lists.md
- spec/003_cards.md

## 対象

- ボード一覧画面
- ボード詳細画面
- ボード作成、ボード名編集、ボード削除
- リスト作成、リスト名編集、リスト削除、リスト並び順
- カード作成、カードタイトル編集、カード説明文編集、カード削除、カード並び順
- カード詳細モーダルの基本構造

## データ

- Board: id, title, order, createdAt, updatedAt
- List: id, boardId, title, order, createdAt, updatedAt
- Card: id, listId, title, description, order, createdAt, updatedAt

## 入力制約

- BoardとListのtitleは1〜100文字
- Cardのtitleは1〜200文字
- Cardのdescriptionは0〜2000文字
- 空文字や上限超過は422

## 画面

- `/` はボード一覧
- `/boards/[id]` はボード詳細
- データが0件でも空状態を表示

## API

- 必要なCRUD APIを定義
- 存在しないIDは404
- バリデーション失敗は422

## 権限

- `constitution.md` のowner、member、viewer方針に従う

## 非機能

- `constitution.md` の性能、ログ、エラー処理方針に従う

## 出力ルール

- 指定した4ファイルだけを作成または更新する
- 指定した4ファイル以外が必要な場合は、作業前に理由と対象ファイルを示して確認する
- `spec/000_shared_rules.md` には、共通エラー形式、権限ロール、order規則、ID規則、ログ方針、日付方針をまとめる
- 各機能仕様には機能要件、受入条件、異常系、境界条件、バリデーション、権限境界、非機能要件、参照する既存ファイル、未決事項を分けて書く
- 不明点がある場合は、仕様を書き始める前に質問する
- 作成または更新したファイル一覧を最後に示す
