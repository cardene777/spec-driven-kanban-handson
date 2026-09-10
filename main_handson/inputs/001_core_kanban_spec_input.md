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
- `/boards/[boardId]` はボード詳細
- データが0件でも空状態を表示

## API

- 必要なCRUD APIを定義
- 存在しないIDは404
- バリデーション失敗は422

## 初期実装の認証と権限

- 初期実装では認証と権限確認を実装しない。Board・List・CardのAPIは権限確認を通過する前提とし、権限を確認する位置と失敗時の応答だけを仕様に書く
- `User`、`BoardMembership`、owner・member・viewerのロール確認、資格情報の検証、セッション管理、ログイン、招待、権限管理の画面、利用者の切り替えはCHAPTER 05では実装しない。操作ログは初期実装に含める

## 非機能

- `constitution.md` の性能、ログ、エラー処理方針に従う

## 出力ルール

- 指定した4ファイルだけを作成または更新する
- 指定した4ファイル以外を変更する必要がある場合は、変更理由とファイル名を示し、書き出す前に確認を受ける
- `spec/000_shared_rules.md` には、共通エラー形式、権限ロール、order規則、ID規則、ログ方針、日付方針をまとめる
- 各機能仕様には機能要件、受入条件、異常系、境界条件、バリデーション、初期実装の認証・認可の扱い、非機能要件、参照する既存ファイル、未決事項を分けて書く
- 不明点がある場合は、仕様を書き始める前に質問する
- 完了時に、作成または更新したファイルを一覧で報告する
