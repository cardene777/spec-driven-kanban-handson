---
name: implement
description: 仕様・設計からコード一式（API・UI・認証・権限チェック・監査ログ・テスト）を生成する
---

# /implement

`/design` の「非機能の実装方針」と「権限チェックの配置」を読み、コードに落とすスキル。
API・UI・認証・権限チェック・監査ログ・テストを、仕様と設計に沿ってまとめて生成する。

## トリガー条件

- 「この設計を実装して」、「本章の仕様と設計を実装して」
- `spec.md` + `design.md` が揃ったあと

## 入力

- `constitution.md`
- 対象の `spec/*.md`
- 対応する `design/*.md`
- 既存コード

## 出力

仕様と設計に従って、以下を生成または更新する。

- `lib/auth/index.ts` 認証ユーティリティ（requireAuthなど）
- `lib/permission/index.ts` 権限チェック関数（requireOwner, requireMember等）
- `lib/logger.ts` 構造化ロガー
- `middleware.ts` リクエストID付与とログコンテキスト
- 各APIハンドラ冒頭の `requireAuth()` / `requirePermission()` 呼び出し
- 監査ログ対象操作の `logger.info` / `logger.warn` 呼び出し

各ファイルには対応する仕様要件IDと設計セクション参照をコメントで残す。

## 作業手順

1. 入力ファイル確認
   `constitution.md` `spec/*.md` `design/*.md` を読み込む。
2. 既存コード確認
   既存コードをGlobで把握する。
3. 基盤ファイル生成
   認証・権限・ロガー基盤が未実装ならまず生成する。
   - `lib/auth/index.ts`
   - `lib/permission/index.ts`
   - `lib/logger.ts`
   - `middleware.ts`
4. データモデル更新
   `prisma/schema.prisma` に必要なロール・権限テーブルを追加する。
5. アプリコード生成
   バリデーション・データアクセス・APIハンドラ・UIを生成する。
6. 権限チェック追加
   各APIハンドラの先頭に `requireAuth()` と `requirePermission()` を入れる。
7. 監査ログ追加
   監査ログ対象操作には `logger.info` / `logger.warn` を入れる。
8. テスト生成
   正常系1 / 異常系1 / 権限なし1の3ケースをカバーするテストを生成する。
9. 静的検証
   `npm run lint && npm run typecheck` を実行して通ることを確認する。
10. 失敗時対応
   失敗したら修正して再実行する。3回失敗したら止めてユーザーに報告する。

## コード生成の方針

### 認証ユーティリティ

```ts
// lib/auth/index.ts
export async function requireAuth(req: Request): Promise<{ userId: string }> {
  const token = extractToken(req);
  if (!token) throw new HttpError(401, "Unauthorized");
  const payload = verifyToken(token);
  return { userId: payload.sub };
}
```

### 権限チェック

```ts
// lib/permission/index.ts
export async function requireOwner(boardId: string, userId: string) {
  const role = await getRole(boardId, userId);
  if (role !== "owner") throw new HttpError(403, "Forbidden");
}
```

### APIハンドラ

```ts
// app/api/boards/[id]/route.ts
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth(req);
  await requireOwner(params.id, userId);
  // FR-005 ボード削除
  await boardRepository.delete(params.id);
  logger.info({ event: "board.delete", boardId: params.id, userId });
  return NextResponse.json({}, { status: 204 });
}
```

## 注意事項

- 仕様にない権限チェックを勝手に追加しない。仕様変更が必要なら `/spec` に戻る
- 構造化ログにはPII（個人識別情報）を直接含めない。userIdのみで参照可能にする
- エラーはthrowしてmiddlewareで集約処理する。各ハンドラ内でtry-catchを散らさない
- テストは正常系 / 異常系 / 権限なし の3ケースが揃って初めて完了
