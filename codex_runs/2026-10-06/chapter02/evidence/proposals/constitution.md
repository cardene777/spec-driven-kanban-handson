# シンプルなカンバン Constitution

## プロジェクト概要

Simple Kanban / タスクをカードで管理する最小構成のカンバンアプリ。個人開発。

## 技術スタック

- フロントエンド: Next.js 16 App Router + TypeScript
- バックエンド: Next.js Route Handler
- データベース: SQLite + Prisma 7
- スタイル: Tailwind CSS
- テスト: Vitest 4
- パッケージマネージャ: npm

## コーディング規約

### 命名規則

- 変数・関数camelCase、型・コンポーネントPascalCase。
- ファイル名はkebab-caseまたはフレームワーク慣習。

### ファイル構成

- app/: App Routerの画面とRoute Handler。
- lib/: 共通ロジックとデータアクセス。
- prisma/: データベーススキーマとmigration。
- tests/: Vitestテスト。

### コメント方針

- 「何を」ではなく「なぜ」を書く。自明なコメントは書かない。
- 生成・更新ファイルに対応する仕様要件IDを残す。

## 基本原則

### シンプルさ優先

動く最小実装を先に作り、抽象化は必要になってから行う。早すぎる最適化を避ける。

### 仕様駆動

仕様を書いてから実装し、仕様変更は実装変更より先に行う。仕様に含まれない機能は追加しない。

### 入力エラーと境界値

空文字、文字数上限、存在しないIDへのアクセスを仕様に含める。
HTTPステータスと `{ "error": { "code": "...", "message": "..." } }` を統一する。
対象が無いときは404を先に返し、対象がある場合だけ400の入力検証を行う。
タイトルのトリムと文字数の条件はspecで定める。

## セキュリティ要件

認証は不要。機密データの有無は入力に指定されていないため、機密データを扱う機能・権限を追加しない。

## 成功基準

このConstitutionと仕様・設計を満たし、検証コマンドと主要なブラウザ操作で確認する。
変更が必要な場合は本ファイルを更新してから実装に反映する。

## 検証コマンド

- lint: `npm run lint` （ESLint CLI）
- typecheck: `npm run typecheck` （`tsc --noEmit`）
- test: `npm run test` （`vitest run`）
- build: `npm run build` （`next build`）
