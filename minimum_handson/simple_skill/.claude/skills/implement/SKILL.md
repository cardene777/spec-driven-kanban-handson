---
name: implement
description: `/spec` で作った仕様から、実装コード一式（API・UI・テストの最低限）を生成する
---

# /implement

仕様をもとに、実装コードと最低限のテストを生成するスキル。
生成後は、報告された確認コマンドとブラウザ操作で、仕様どおりに動くかを確認する。

第2章のミニマムハンズオンでは、プロンプトだけで作ったものと同じ最小構成のカンバンアプリを別ディレクトリで作る。
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
- `lib/validation/` トリム検証関数（`design/001_minimum_kanban.md` の方針に従う。第2章では共有関数に集約し、Board・List・Cardで上限だけを差し替える）
- `prisma/schema.prisma` データベーススキーマ（新規エンティティ時）
- `prisma.config.ts` Prisma 7のCLI設定
- `generated/prisma/` 生成済みPrisma Client
- `lib/prisma.ts` adapterを渡して生成Clientを生成する共有モジュール
- `vitest.config.ts` と `package.json` の `test` script
- `tests/api/{resource}.test.ts` APIの最低限のテスト

実際のファイル構成は `constitution.md` に従う。

## 作業手順

1. 入力ファイル確認
   `constitution.md`、`spec/*.md`、`design/001_minimum_kanban.md` を読み込む。
2. プロジェクト初期化確認
   `package.json` が存在しない場合は、Next.js App Router + TypeScript + Tailwind CSSでプロジェクトを初期化する。
   第2章ではPrisma 7 + SQLiteを使う。`prisma`、`@types/node`、`@types/better-sqlite3` を開発依存に、`@prisma/client`、`@prisma/adapter-better-sqlite3`、`better-sqlite3`、`dotenv`を依存に追加する。`better-sqlite3` は adapter が実行時に呼ぶ SQLite ドライバ本体なので、これを入れないと `npm run build` が実行時に失敗する。
   `prisma.config.ts` または `prisma/schema.prisma` が無い場合は `npx prisma init --datasource-provider sqlite --output ../generated/prisma` を実行し、`.env`、`prisma.config.ts`、`prisma/schema.prisma` を作る。init が `prisma/schema.prisma` の `datasource` に生成する `url = env("DATABASE_URL")` の行は、adapter 方式では不要なので削除する (接続 URL は `prisma.config.ts` と `lib/prisma.ts` 側で渡す)。
   schemaは `prisma-client` generatorと `output = "../generated/prisma"` を使う。`lib/prisma.ts` では生成済みClientをimportし、`PrismaBetterSqlite3` adapterを渡して生成する。`prisma-client` generatorはESM出力のため、既存の`package.json`とNext.js設定を確認して必要なESM互換設定を反映する。既存設定と衝突しそうな場合は、推測で変更せず理由を報告する。schema変更後は `npx prisma migrate dev --name init` と `npx prisma generate` を実行する。
   Vitestが無い場合は導入し、`vitest.config.ts` と `"test": "vitest run"` を設定する。
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
   生成後、`npm run lint`、`npm run typecheck` または `npx tsc --noEmit`、`npm run test`、`npm run build` の順に実行して通ることを確認する。実行できないコマンドは理由とともに未完了として報告する。
8. 失敗時対応
   失敗したら修正して再実行する。3回失敗したら止めてユーザーに報告する。

## コード生成の方針

### APIルートハンドラ

- リクエストパースとバリデーションは関数の先頭で行う
- ただし親または対象リソースが無い場合は、先に404を返す。対象がある場合だけ入力を検証して400を返す
- 異常系は `spec/*.md` の異常系表のとおりHTTPステータスを返す
- DBアクセスはrepository層を経由する
- レスポンスは `NextResponse.json({...}, { status })`

### UIコンポーネント

- Server Componentを基本にする
- 状態が必要な箇所のみClient Component
- フォームはServer Actionまたはfetch + revalidate

### バリデーション

- `design/001_minimum_kanban.md` のバリデーション方針に従う。第2章では、トリム検証を `lib/validation/` の共有関数に集約し、Board・List（1〜100）とCard（1〜200）で上限だけを差し替える
- titleは前後の半角・全角空白、タブ、改行を除去してから検証し、トリム後の値を保存する
- 対象リソースの存在確認後に入力を検証する
- 失敗時は `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` を400で返す

### テスト

- 第2章では、カードタイトルの正常な作成と編集をテストする
- 空文字と201文字のカードタイトルを、作成と編集の両方でテストする
- 異常系では400を返し、カードが追加・更新されないことを確認する
- 存在しない対象に不正な入力を送った場合は404を優先すること、リストとカードの `order` が親内で0から連番になることも確認する
- 詳細なテストはメインハンズオンの `/test` スキルで追加する

## 注意事項

- 仕様にない機能を勝手に追加しない（必要なら `/spec` に戻る）
- 既存コードの大幅リファクタは行わない（最小差分で動かす）
- 生成失敗時はEditで修正、Writeで全体書き換えしない
- lint、型チェック、テスト、buildが通るまで完了と報告しない。実際の操作はブラウザでも確認する
- 第2章では軽量な `/design` を呼び出す。詳細な非機能設計、権限設計、UI階層設計はメインハンズオンで扱う
