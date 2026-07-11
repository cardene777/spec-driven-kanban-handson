---
name: implement
description: `/spec` で作った仕様から、実装コード一式（API・UI・テストの最低限）を生成する
---

# /implement

仕様をもとに、実際に動くコードを生成するスキル。
ここで生成するのは「動く最小実装」で、洗練は後続フェーズで行う。

第2章のミニマムハンズオンでは、プロンプトだけで作ったものと同じシンプルなカンバンを別ディレクトリで作る。
以下の4つをspec/配下の全仕様と `design/001_minimum_kanban.md` から一気に実装する。

1. ボード一覧とボード作成
2. ボード詳細とリスト作成
3. カード追加と表示
4. カードタイトル編集

ボード削除、リスト削除、カード削除、ボード編集、リスト編集は実装しない。
仕様に含まれていない機能を補完で追加しない。

## トリガー条件

以下のいずれかに該当する場合に呼び出す。

- 「この仕様を実装して」、「{機能名}のコードを書いて」
- `spec.md` ができたあと
- 仕様変更後の再生成

## 入力

- `constitution.md`（コーディング規約と技術スタック）
- 対象の `spec/*.md` すべて
- `design/001_minimum_kanban.md`
- 既存コード（差分実装の場合）

## 出力

以下のファイル群を生成または更新する。

- `app/api/{resource}/route.ts` APIルートハンドラ
- `app/{path}/page.tsx` UIページ
- `app/{path}/_components/{Component}.tsx` UIコンポーネント
- `lib/repository/{entity}.ts` データアクセス層
- `lib/validation/{entity}.ts` バリデーションスキーマ（Zod等）
- `prisma/schema.prisma` データベーススキーマ（新規エンティティ時）
- `tests/api/{resource}.test.ts` APIの最低限のテスト

実際のファイル構成は `constitution.md` に従う。

## 作業手順

1. 入力ファイル確認
   `constitution.md`、`spec/*.md`、`design/001_minimum_kanban.md` を読み込む。
2. プロジェクト初期化確認
   `package.json` が存在しない場合は、Next.js App Router + TypeScript + Tailwind CSSでプロジェクトを初期化する。
   Prisma + SQLiteを導入し、`.env` と `prisma/schema.prisma` を用意する。
   `package.json` が存在する場合は、既存プロジェクトを前提に差分実装する。
3. 既存コード確認
   Globで関連ファイルを探し、既存コードを把握する。
4. 不足ファイル生成
   不足ファイルを順に生成する。
   - データモデル（prisma/schema.prisma）
   - バリデーション（lib/validation/）
   - データアクセス（lib/repository/）
   - APIハンドラ（app/api/）
   - UIコンポーネント（app/）
   - テスト（tests/）
5. 要件IDの記録
   各ファイル生成後、対応する仕様要件IDをコメントに残す。例: `// FR-001`
6. 異常系実装
   異常系のレスポンスは `spec/*.md` の異常系表と `design/001_minimum_kanban.md` のAPI設計どおりに実装する。
7. 静的検証
   生成後、`npm run lint && npm run typecheck` をBashで実行して通ることを確認する。
8. 失敗時対応
   失敗したら修正して再実行する。3回失敗したら止めてユーザーに報告する。

## コード生成の方針

### APIルートハンドラ

- リクエストパースとバリデーションは関数の先頭で行う
- 異常系は `spec/*.md` の異常系表のとおりHTTPステータスを返す
- DBアクセスはrepository層を経由する
- レスポンスは `NextResponse.json({...}, { status })`

### UIコンポーネント

- Server Componentを基本にする
- 状態が必要な箇所のみClient Component
- フォームはServer Actionまたはfetch + revalidate

### バリデーション

- Zodスキーマで定義する
- APIハンドラの先頭で `schema.safeParse(body)` する
- 失敗時は400でdetailsを返す

### テスト

- APIハンドラの正常系1ケース + 異常系1ケースを最低限カバーする
- 詳細なテストはメインハンズオンの `/test` スキルで追加する

## 注意事項

- 仕様にない機能を勝手に追加しない（必要なら `/spec` に戻る）
- 既存コードの大幅リファクタは行わない（最小差分で動かす）
- 生成失敗時はEditで修正、Writeで全体書き換えしない
- 動作確認は型チェックまで。実際の動作はブラウザで確認する
- 第2章では軽量な `/design` を呼び出す。詳細な非機能設計、権限設計、UI階層設計はメインハンズオンで扱う
