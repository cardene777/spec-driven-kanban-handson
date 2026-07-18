# Simple Kanban Constitution

## プロジェクト概要

タスクをカードで管理する最小構成のカンバンアプリ。

## 技術スタック

- フロントエンド Next.js（App Router）+ React
- バックエンド Next.js Route Handlers（`app/api/`）
- データベース SQLite + Prisma 7（`@prisma/adapter-better-sqlite3` を利用）
- スタイル Tailwind CSS
- テスト Vitest
- パッケージマネージャ npm

## コーディング規約

### 命名規則

- 変数・関数 camelCase
- 型・コンポーネント PascalCase
- ファイル名 kebab-case または Next.js の慣習（`page.tsx` `route.ts` など）

### ファイル構成

- `app/` Next.js App Router のルーティングと API（`app/api/`）
- `lib/` 共有ロジック（Prisma クライアント、バリデーション、リポジトリ層）
- `prisma/` データベーススキーマとマイグレーション
- `tests/` テストコード

### コメント方針

- 「何を」ではなく「なぜ」を書く
- 自明なコメントは書かない

## 基本原則

### シンプルさ優先

- 動く最小実装を先に、抽象化は必要になってから
- 早すぎる最適化は避ける

### 仕様駆動

- 仕様を書いてから実装する
- 仕様変更は実装変更より先に行う

### 入力エラーと境界値

- 空文字、文字数上限、存在しないIDへのアクセスを仕様に含める
- HTTPステータスと `{ "error": { "code": "...", "message": "..." } }` のエラー形式を統一する

## セキュリティ要件

- 個人開発・ローカル学習用途を前提とし、認証は導入しない
- 機密データや個人情報は扱わない（Board・List・Card のタイトルと description のみ保存）
- 入力バリデーションは必ず行い、不正な入力には 400 を返す
- 認証やロールが必要になった段階で本ファイルを先に更新してから実装に反映する

## 成功基準

この Constitution を満たすことが、本プロジェクトの最低品質ラインとする。
変更が必要な場合は本ファイルを更新してから実装に反映する。

## 検証コマンド

- lint `npm run lint`
- typecheck `npm run typecheck`。script が無い場合は `npx tsc --noEmit`
- test `npm run test`
- build `npm run build`
