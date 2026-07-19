# シンプルなカンバン Constitution

## プロジェクト概要

タスクをカードで管理する最小構成のカンバンアプリ（Simple Kanban）。

## 技術スタック

- フロントエンド Next.js 16（App Router）+ React + Tailwind CSS
- バックエンド Next.js App Router の Route Handlers（`app/api/`）
- データベース SQLite + Prisma 7
  - `@prisma/adapter-better-sqlite3` の adapter 方式
  - `prisma-client` generator
  - `output = "../generated/prisma"`
- スタイル Tailwind CSS
- テスト Vitest 4
- パッケージマネージャ npm

### 初期化方針

- `create-next-app` は `--webpack` で初期化する（Turbopack は使わない）
- Prisma は adapter 方式（接続 URL は `prisma.config.ts` と `lib/prisma.ts` 側で渡し、`schema.prisma` の `datasource` に `url` は置かない）

## コーディング規約

### 命名規則

- 変数・関数 camelCase
- 型・コンポーネント PascalCase
- ファイル名 kebab-case または Next.js の慣習（`page.tsx`、`route.ts`、`_components/`）

### ファイル構成

- `app/` Next.js App Router のルーティングと API
- `lib/` 共有ロジック（`lib/prisma.ts`、`lib/repository/`、`lib/validation/`、`lib/errors.ts`）
- `prisma/` データベーススキーマとマイグレーション
- `generated/prisma/` 生成済み Prisma Client
- `tests/` テストコード

### コメント方針

- 「何を」ではなく「なぜ」を書く
- 自明なコメントは書かない
- 各ファイルには対応する仕様要件 ID（例 `// FR-001`）を残す

## 基本原則

### シンプルさ優先

- 動く最小実装を先に、抽象化は必要になってから
- 早すぎる最適化は避ける

### 仕様駆動

- 仕様を書いてから実装する
- 仕様変更は実装変更より先に行う

### 入力エラーと境界値

- 空文字、文字数上限、存在しない ID へのアクセスを仕様に含める
- 対象リソースが無い場合は 404 を先に返し、対象がある場合だけ入力を検証して 400 を返す
- HTTP ステータスと `{ "error": { "code": "...", "message": "..." } }` のエラー形式を統一する

## セキュリティ要件

- 想定規模は個人開発
- 認証は不要（ログイン・権限管理・メンバー招待は行わない）
- 機密データは扱わない

## 成功基準

この Constitution を満たすことが、本プロジェクトの最低品質ラインとする。
変更が必要な場合は本ファイルを更新してから実装に反映する。

## 検証コマンド

- lint `npm run lint`（eslint を直接使う。`next lint` は使わない）
- typecheck `npm run typecheck`。script が無い場合は `npx tsc --noEmit`
- test `npm run test`（`vitest run`）
- build `npm run build`
