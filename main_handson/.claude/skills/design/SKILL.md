---
name: design
description: 仕様からデータモデル・API・UIに加え、非機能の実装方針（性能・セキュリティ・運用）まで起こしたdesign.mdを生成する
---

# /design

本章で新しく導入する設計分離のスキル。
`/spec` が定義した非機能要件・権限境界を、設計レベルで具体化する。

## トリガー条件

- 「この仕様の設計を書いて」、「本章用の設計を起こして」
- `spec.md` ができたあと、`/implement` の前に呼ぶ

## 入力

- `constitution.md`
- 対象の `spec/*.md`
- 既存の `design/*.md`

## 出力

`design/{機能ID}_{機能名}.md` を生成する。
以下のセクションを持つ設計文書を作成する。

```markdown
# {機能名}の設計
## 関連仕様
## データモデル
## API設計
## UI構造
## 非機能の実装方針

### 性能

- 一覧APIはLIMIT 100 + cursorベースのページング
- N+1を避けるためにPrismaのincludeを活用
- 計算量の重い処理（ボードのカード数集計など）はキャッシュ層を挟む

### セキュリティ

- 全APIハンドラの先頭で `requireAuth()` ヘルパで認証チェック
- 操作ごとに `requirePermission(boardId, role)` で権限チェック
- 入力はZod[4]で型・形式・範囲を全てバリデーション

### 運用

- 全APIレスポンスヘッダに `X-Request-Id` を付与
- エラーは `logger.error({ requestId, error })` で構造化JSON出力

## 権限チェックの配置

| ハンドラ | チェック関数 | 失敗時 |
|---|---|---|
| POST /api/boards | requireAuth | 401 |
| DELETE /api/boards/:id | requireOwner(boardId) | 403 |
| PATCH /api/cards/:id | requireMember(boardId) | 403 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| ボード削除 | info | requestId / userId / boardId |
| 権限変更 | warn | requestId / userId / boardId / oldRole / newRole |

## 実装方針

- `lib/auth/` 配下に認証ユーティリティを集約
- `lib/permission/` 配下に権限チェック関数を集約
- 構造化ログは `lib/logger.ts` で一元管理
```

## 作業手順

1. 入力ファイル確認
   `constitution.md` と対象の `spec/*.md` を読む。
2. 既存設計確認
   既存 `design/` をGlobで探し、関連があれば読む。
3. 基本設計作成
   対象仕様からデータモデル・API・UIを起こす。
4. 強化セクション作成
   加えて、非機能の実装方針 / 権限チェックの配置 / 監査ログ / 実装方針 の4セクションを書く。
5. 技術選択の明示
   非機能要件の数値目標を満たすための具体的な技術選択（インデックス・キャッシュ等）を明示する。
6. ファイル書き出し
   ユーザー承認後にファイルを書き出す。

## 注意事項

- 仕様にない非機能要件を勝手に追加しない。仕様変更が必要なら `/spec` に戻る
- 権限チェック関数は `/implement` で生成するコードと整合させる
- 性能要件を満たすための技術選択は、constitution.mdの技術スタック範囲内で行う
