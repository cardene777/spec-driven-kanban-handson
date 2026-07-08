---
name: implement
description: `/spec` と `/design` で作ったドキュメントから、実装コード一式（API・UI・テストの最低限）を生成する
---

# /implement

仕様と設計をもとに、実際に動くコードを生成するスキル。
ここで生成するのは「動く最小実装」で、洗練は後続フェーズで行う。

## トリガー条件

以下のいずれかに該当する場合に呼び出す。

- 「この設計を実装して」「{機能名}のコードを書いて」
- spec.mdとdesign.mdができたあと
- 仕様変更後の再生成

## 入力

- `constitution.md`（コーディング規約と技術スタック）
- 対象の `spec/*.md`
- 対応する `design/*.md`
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

実際のファイル構成はconstitution.mdに従う。

## 作業手順

1. 入力ファイル確認
   `constitution.md` `spec/*.md` `design/*.md` を読み込む。
2. 既存コード確認
   Globで関連ファイルを探し、既存コードを把握する。
3. 不足ファイル生成
   不足ファイルを順に生成する。
   - データモデル（prisma/schema.prisma）
   - バリデーション（lib/validation/）
   - データアクセス（lib/repository/）
   - APIハンドラ（app/api/）
   - UIコンポーネント（app/）
   - テスト（tests/）
4. 要件IDの記録
   各ファイル生成後、対応する仕様要件IDをコメントに残す。例: `// FR-001`
5. 異常系実装
   異常系のレスポンスはdesign.mdの表どおりに実装する。
6. 静的検証
   生成後、`npm run lint && npm run typecheck` をBashで実行して通ることを確認する。
7. 失敗時対応
   失敗したら修正して再実行する。3回失敗したら止めてユーザーに報告する。

## コード生成の方針

### APIルートハンドラ

- リクエストパースとバリデーションは関数の先頭で行う
- 異常系はdesign.mdの異常系表のとおりHTTPステータスを返す
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
- 詳細なテストは第5章 `/test` スキルで追加する

## 注意事項

- 仕様にない機能を勝手に追加しない（必要なら `/spec` に戻る）
- 既存コードの大幅リファクタは行わない（最小差分で動かす）
- 生成失敗時はEditで修正、Writeで全体書き換えしない
- 動作確認は型チェックまで。実際の動作は読者がブラウザで確認する
