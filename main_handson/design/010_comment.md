# コメント機能の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`
- `spec/003_cards.md`
- `spec/005_card_detail.md`
- `spec/010_comment.md`

## 前提

Prisma 全体スキーマ、認証・認可の共通ユーティリティ (`requireCurrentUser` / `assertBoardAccess` / `getBoardRole`)、エラーレスポンスヘルパ (`lib/http/errors.ts`)、監査ログ形式 (`lib/log/audit.ts`)、バリデーション方針 (zod)、`withApiHandler` は `design/001_boards.md § 共通設計方針` を参照する。
Card エンティティの基本と `resolveBoardFromCard(cardId)` は `design/003_cards.md § データモデル` を参照する。
本 file は `spec/010_comment.md` を満たすコメント機能 (投稿・一覧取得・削除) の設計に閉じる。

## 既存設計との差分

- `design/005_card_detail.md § データモデル § Comment モデル (新設)` は本設計の初期案 (下敷き) である。本 file が Comment に関する SSOT となる。
- `design/005_card_detail.md § API 設計` の `GET / POST /api/cards/{cardId}/comments` および `DELETE /api/comments/{commentId}` の記述は本 file が上書きする。
- 本 file と `design/005_card_detail.md` の Comment 関連記述が矛盾した場合は、本 file を優先する。
- 主要な差分は以下の 3 点。
  - 一覧の `orderBy` = `design/005_card_detail.md` は `[{ createdAt: "asc" }, { id: "asc" }]` だったが、本 file では `[{ createdAt: "desc" }, { id: "asc" }]` に変更する (`spec/010_comment.md § 非機能要件 § 一覧の並び順`)。
  - HTML エスケープ = 保存直前に `lib/comments/escape.ts` の `escapeHtml(body)` を通す。`design/005_card_detail.md § 非機能の実装方針 § セキュリティ` は「React JSX の自動エスケープに任せる」 のみを述べていたが、本 file では「保存側と表示側の二重防御」 に更新する。
  - 長さ判定 = HTML エスケープ後ではなく、元文字列 (エスケープ前) の文字数で判定する (`spec/010_comment.md § 境界条件`)。schema 内でエスケープを行わず、schema は元文字列の長さと型を検証するのみとする。

## データモデル

### Comment モデル (新設)

`prisma/schema.prisma` に以下を追加する。

```prisma
model Comment {
  id        String   @id @default(cuid())
  cardId    String
  authorId  String
  body      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  card   Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  author User @relation("CommentAuthor", fields: [authorId], references: [id], onDelete: Cascade)

  @@index([cardId])
  @@index([authorId])
}
```

- `body` はアプリ層でトリム済み 1〜2000 文字を保証、HTML エスケープ済みの文字列を保存する (`spec/010_comment.md § 非機能要件 § セキュリティ`)。エスケープ後の文字数は判定対象外 (元文字列基準で 2000 文字上限を担保する)。
- `onDelete: Cascade` により、Card / User が物理削除された場合に Comment も自動的に削除される (`spec/010_comment.md § 対象データ` の物理削除方針を DB 側でも保証)。
- `Comment.updatedAt` は Prisma `@updatedAt` により自動更新されるが、本 spec ではコメント編集を対象外とするため実質使わない (将来のコメント編集機能で活用する)。

### User モデル拡張 (relation 追加)

既存の `User` に本 relation を追加する。

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships BoardMembership[]
  comments    Comment[]         @relation("CommentAuthor")
}
```

### Card モデル拡張 (relation 追加)

既存の `Card` に本 relation を追加する。

```prisma
model Card {
  id          String   @id @default(cuid())
  listId      String
  title       String
  description String   @default("")
  order       Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  list     List      @relation(fields: [listId], references: [id], onDelete: Cascade)
  comments Comment[]

  @@unique([listId, order])
  @@index([listId])
}
```

### 補助クエリ

`lib/auth/commentAccess.ts` に以下を配置する。カード → ボードの解決経路 (`design/003_cards.md § 補助クエリ`) と類似する。

```ts
export async function resolveBoardFromComment(commentId: string): Promise<{
  id: string;
  cardId: string;
  authorId: string;
  boardId: string;
}> {
  const c = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      cardId: true,
      authorId: true,
      card: { select: { list: { select: { boardId: true } } } },
    },
  });
  if (!c) throw new NotFoundError();
  return {
    id: c.id,
    cardId: c.cardId,
    authorId: c.authorId,
    boardId: c.card.list.boardId,
  };
}
```

未存在は `NotFoundError` を throw する。

### 削除権限判定 (pure 関数)

`lib/auth/canDeleteComment.ts` に以下を配置する (`design/005_card_detail.md § 実装方針` を継承し pure 関数として切り出す)。

```ts
import type { Role } from "@prisma/client";

export function canDeleteComment(input: {
  actorId: string;
  authorId: string;
  actorRole: Role;
}): boolean {
  const { actorId, authorId, actorRole } = input;
  if (actorRole === "owner") return true;
  if (actorRole === "member" && actorId === authorId) return true;
  return false;
}
```

- `viewer` は常に `false`。
- `member` は投稿者本人の場合のみ `true`。
- `owner` は投稿者を問わず `true`。

### HTML エスケープ (pure 関数)

`lib/comments/escape.ts` に以下を配置する。

```ts
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}
```

- 単一パスで 5 文字を置換する。`&` を先頭に置くことで `&amp;` の二重エスケープを避ける (置換は元文字列に対して一括で行われるため、既にエスケープ済みの文字列を再度通すと `&amp;lt;` のような二重エスケープが発生する点は呼び出し側で保証する = 本 spec では Route Handler が「保存前に 1 度だけ」 呼ぶ)。
- `spec/010_comment.md § 境界条件 § `body` の HTML エスケープ後の長さ` に従い、長さ判定は本関数の呼び出しよりも「前」 に行う (schema 検証で `too_long` を返してからエスケープする)。

### JSON 表現

```json
{
  "id": "cmt_abc",
  "cardId": "clx...",
  "authorId": "usr_abc",
  "body": "&lt;script&gt;alert(1)&lt;/script&gt;",
  "createdAt": "2026-07-12T10:00:00.000Z",
  "updatedAt": "2026-07-12T10:00:00.000Z"
}
```

- 一覧 API のレスポンスは `{ "items": Comment[] }` (`spec/000_shared_rules.md § 一覧 API のレスポンス構造`)。
- 投稿 API の `201` body は作成された `Comment` オブジェクト (エスケープ済み `body` を含む)。
- 削除 API は body なしで `204` を返す。

## API 設計

`spec/010_comment.md § API` の 3 endpoint を Route Handler で実装する。file 配置。

- `app/api/cards/[cardId]/comments/route.ts` … `GET` / `POST`
- `app/api/comments/[commentId]/route.ts` … `DELETE`

### `GET /api/cards/{cardId}/comments` 一覧取得

- 入力 = パスパラメータ `cardId`。
- 権限 = 対象ボードの `viewer` 以上。
- 処理。
  1. `user = requireCurrentUser(request)`、未認証なら `401`。
  2. `card = resolveBoardFromCard(cardId)`、未存在なら `404`。
  3. `assertBoardAccess(user.id, card.boardId, "viewer")`、未参加なら `404`。
  4. `prisma.comment.findMany({ where: { cardId }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] })`。
- 出力 = `200 { items: Comment[] }`。0 件時は `{ items: [] }`。
- ステータス = `200` / `401` / `404`。
- ログ = `event=comment.list`、`targetType=comment`、`targetId=cardId`、`context={ cardId, boardId, count }`。

### `POST /api/cards/{cardId}/comments` 投稿

- 入力 = パスパラメータ `cardId`、body = `{ body: string }`。
- 権限 = 対象ボードの `member` 以上。
- バリデーション (zod、`lib/schemas/comments.ts` の `parseCommentCreate`)。
  - `body` フィールドが未指定 or `undefined` は `422 { body: "required" }`。
  - `body` が文字列型でない (`invalid_type` 判定を先に行う) は `422 { body: "invalid_type" }`。
  - `body` の元文字列を `trim()` した結果が 0 文字は `422 { body: "required" }`。
  - `body` の元文字列 (トリム前) の文字数が 2001 以上は `422 { body: "too_long" }`。
- 処理。
  1. `user = requireCurrentUser(request)`、未認証なら `401`。
  2. `card = resolveBoardFromCard(cardId)`、未存在なら `404`。
  3. `assertBoardAccess(user.id, card.boardId, "member")`、`viewer` は `403`、未参加は `404`。
  4. body を zod 検証。schema はトリムせず、元文字列を返す (`spec/010_comment.md § 境界条件` の「トリム前の先頭・末尾の空白は保存時にトリムせず、元文字列のまま HTML エスケープして保存する」)。
  5. `escaped = escapeHtml(parsed.body)` で保存文字列を得る (`lib/comments/escape.ts`)。
  6. `created = prisma.comment.create({ data: { cardId, authorId: user.id, body: escaped } })`。
  7. Card の `updatedAt` は更新しない (`spec/010_comment.md § FR-01`)。
- 出力 = `201 Comment` (エスケープ済み `body` を含む)。
- ステータス = `201` / `401` / `403` / `404` / `422`。
- ログ = `event=comment.create`、`targetType=comment`、`targetId=created.id`、`context={ cardId, boardId, authorId: user.id }`。

### `DELETE /api/comments/{commentId}` 削除

- 入力 = パスパラメータ `commentId`。body なし。
- 権限 = 投稿者本人 (`member` 以上) または対象ボードの `owner`。
- 処理。
  1. `user = requireCurrentUser(request)`、未認証なら `401`。
  2. `comment = resolveBoardFromComment(commentId)`、未存在なら `404`。
  3. `{ role } = assertBoardAccess(user.id, comment.boardId, "viewer")`、閲覧不可なら `404`。
  4. `canDeleteComment({ actorId: user.id, authorId: comment.authorId, actorRole: role })` が `false` なら `ForbiddenError` を throw して `403`。
  5. `prisma.comment.delete({ where: { id: commentId } })`。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404`。
- ログ = `event=comment.delete`、`targetType=comment`、`targetId=commentId`、`context={ cardId: comment.cardId, boardId: comment.boardId, authorId: comment.authorId, actorId: user.id }`。

### 共通ユーティリティの拡張

- `lib/log/audit.ts` の `TargetType` union に `"comment"` を追加する (現状は `"board" | "list" | "card"` の 3 種のみのため、コメント関連ログを扱うために拡張が必要)。
- `lib/http/withApiHandler.ts` の `Options.targetType` は `TargetType` を再利用しているため、追加変更なしで自動的に `"comment"` を受け付ける。
- `lib/http/errors.ts` の 4 種ヘルパは変更なし (本 spec は 401 / 403 / 404 / 422 の 4 種のみを使用する)。

## UI 構造

### 配置

- `components/cards/CardDetailModal.tsx` (既存) を拡張し、モーダル内下部にコメント領域を追加する。
- コメント領域は独立した Client Component (`CardComments`) として実装し、モーダル本体 (`CardDetailModal`) の title / description 編集ロジックとは fetch / mutation state を分ける。
- `spec/005_card_detail.md § カード詳細モーダルの拡張構造` の 6 領域構造のうち、本 spec 実装分はコメント領域のみ。その他 5 領域 (ラベル / 期限 / 担当者 等) は本 spec の対象外のためプレースホルダにしない (既存の title / description / メタ情報 / 削除導線を保持する)。

### 主要 Client Component

| コンポーネント | 責務 |
|---|---|
| `CardComments` | コメント領域全体。 モーダル open 時に `GET /api/cards/{cardId}/comments` を叩き、一覧を state に保持する。投稿 form と一覧行を配置する。 |
| `CardCommentForm` | 新規投稿 form。 `body` の textarea + 送信ボタン。 `POST /api/cards/{cardId}/comments` を叩き、成功時に `CardComments` の一覧を再取得する。 |
| `CardCommentRow` | 1 コメント行。 `authorId` (現時点では文字列表示、`ui-design/` で名前解決) / `createdAt` / `body` を表示する。 削除条件を満たす場合のみ削除ボタンを表示する。 |

- 各コンポーネントは既存の `apiFetch` (`lib/client/apiFetch.ts`) 経由で API を呼び、`X-User-Id` header を付与する。
- 削除ボタンの表示条件は「クライアントが持つ現在ユーザー ID と `authorId` の一致」 または「サーバー側で判定された `owner` フラグ」 のいずれか。本 spec の初期実装ではクライアントに `owner` 情報を渡す経路がないため、削除ボタンは投稿者本人にのみ表示する (owner による他者削除は API 経由 / 開発者ツール等で対応する初期実装とし、`ui-design/` で決定する `viewer` 表示分岐と合わせて別 spec で拡充する)。

### 領域内の状態

- `CardComments` = `idle → loading → success (items=[] なら empty placeholder) | error(inline)`。
- `CardCommentForm` = `idle → submitting → success (一覧再取得) | error(inline: 422 / 403 / 401)`。
- `CardCommentRow` の削除 = `idle → confirming (window.confirm) → submitting → success (一覧再取得) | error(inline: 403 / 404)`。
- 4xx / 5xx はいずれもコメント領域内に inline error を出し、モーダル他領域 (title / description) は影響を受けない (`spec/005_card_detail.md § 領域独立性` を継承)。

### 空状態

- コメント 0 件時は「まだコメントはありません」 相当のプレースホルダを表示する (文言は `ui-design/`)。
- API 呼び出し失敗時は「コメントの取得に失敗しました」 相当のメッセージを領域内に表示する。

## 状態遷移

### エンティティ状態

Comment (1 コメントあたり)。

```
[存在せず]         --POST-->                                    [存在]
[存在]             --DELETE (投稿者本人 or owner)-->            [存在せず (物理削除)]
[Card 削除]        --Cascade-->                                 [存在せず]
[User 削除]        --Cascade-->                                 [存在せず (authorId 経由)]
```

Card (コメント一覧の観点)。

```
[コメント 0 件]  --POST 1 件目-->                              [コメント 1 件 (createdAt=t1)]
[コメント n 件]  --POST 1 件-->                                [コメント n+1 件 (先頭)]
[コメント n 件 (X 含む、X.authorId=actorId, actor role >= member)] --DELETE X--> [コメント n-1 件]
[コメント n 件 (X 含む、actor role = owner)] --DELETE X-->     [コメント n-1 件]
[コメント n 件 (X 含む、actor role = member, X.authorId != actorId)] --DELETE X--> [コメント n 件 (403)]
[コメント n 件 (X 含まず)] --DELETE X-->                       [コメント n 件 (404)]
```

### UI 状態遷移 (コメント領域)

```
モーダル open → CardComments が GET を叩く → loading → success 描画
一覧描画 → CardCommentForm に body 入力 → 送信 → submitting → success (GET 再取得) → 一覧描画
                                                            ↘ error(422) → inline field error → 再入力可能
                                                            ↘ error(403/401) → inline message → 送信禁止
一覧描画 → CardCommentRow の削除ボタン → confirm → submitting → success (GET 再取得) → 一覧描画
                                                              ↘ error(403) → inline message、行は残す
                                                              ↘ error(404) → GET 再取得で最新に整合
モーダル閉じ → CardComments state 破棄、次回 open で再 fetch
```

## 非機能の実装方針

### 性能

- 一覧取得は `@@index([cardId])` 経由で最大数十〜数百件を返すのみ。P95 200ms 以内は SQLite で余裕。ページネーションは本 spec 対象外のため全件返却するが、極端に大量のコメント (数千件) は想定しない。
- 投稿 / 削除は単一 create / delete のみ。1 トランザクション内で完結 (Card `updatedAt` の明示更新は不要のため、Card への `update` は行わない)。P95 300ms 以内。
- モーダルを開くたびに `GET` を再取得する (キャッシュしない)。同一 session 内の投稿 / 削除で state 不整合が起きないよう、投稿 / 削除の成功時に一覧を再取得する。

### セキュリティ (HTML エスケープ)

- 保存時のエスケープは Route Handler の POST 内で `escapeHtml(parsed.body)` を 1 度だけ呼び、その結果を DB に保存する。
- 一覧取得時はエスケープ済み文字列をそのまま JSON に含めて返す。二重エスケープしない。
- 表示時は React JSX の自動エスケープに任せる (`<p>{comment.body}</p>` で `<`、`>` が自動的に `&lt;` / `&gt;` に変換される)。DB 保存時のエスケープと合わせて二重防御となる。
- `dangerouslySetInnerHTML` は使用禁止 (本 spec 対象外の Markdown レンダリング等の実装時に再検討)。
- 長さ判定は元文字列 (エスケープ前) の文字数で行い、schema 内でエスケープを行わない (責務分離)。

### 運用 (操作ログ)

- 投稿・削除操作の監査ログには `cardId` / `boardId` / `authorId` / `actorId` を必ず含める。
- 削除操作では投稿者 (`comment.authorId`) と削除者 (`actorId`) を分けて記録する (owner による他者コメント削除の追跡)。
- エラーレスポンスを返した場合は `spec/000_shared_rules.md § 非機能要件` に従い、ステータス・エラーコード・対象識別子・操作ユーザー識別子をログに記録する (`withApiHandler` が自動で行う)。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `GET /api/cards/{cardId}/comments` | `requireCurrentUser` → `resolveBoardFromCard` → `assertBoardAccess(actorId, boardId, "viewer")` | 未認証 `401`、未存在 / 閲覧不可 `404` |
| `POST /api/cards/{cardId}/comments` | `requireCurrentUser` → `resolveBoardFromCard` → `assertBoardAccess(actorId, boardId, "member")` → body 検証 → `escapeHtml` → create | 未認証 `401`、未存在 / 閲覧不可 `404`、`viewer` は `403`、検証失敗 `422` |
| `DELETE /api/comments/{commentId}` | `requireCurrentUser` → `resolveBoardFromComment` → `assertBoardAccess(actorId, boardId, "viewer")` → `canDeleteComment` 判定 → delete | 未認証 `401`、未存在 / 閲覧不可 `404`、削除権限なし `403` |

- 削除 API の `assertBoardAccess` は `viewer` 以上で判定する (閲覧権限がないユーザーには存在の露出を避けるため `404` を返す)。その後の `canDeleteComment` で「投稿者本人 (`member` 以上) or `owner`」 を判定し、満たさない場合は `403` を返す。

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `comment.list` 成功 | `info` | `actorId`、`targetType=comment`、`targetId=cardId`、`context={ cardId, boardId, count }`、`status=200` |
| `comment.create` 成功 | `info` | `actorId`、`targetType=comment`、`targetId=作成 commentId`、`context={ cardId, boardId, authorId: actorId }`、`status=201` |
| `comment.delete` 成功 | `info` | `actorId`、`targetType=comment`、`targetId=commentId`、`context={ cardId, boardId, authorId, actorId }`、`status=204` |
| 全操作の `401` / `403` / `404` / `422` / `5xx` | `warn` / `warn` / `warn` / `warn` / `error` | `design/001_boards.md § 監査ログの共通形式` を継承 |

## テスト方針

### Vitest 構成 (Board / List / Card 設計と共通)

- **単体テスト** … zod schema (`parseCommentCreate`)、HTML エスケープ pure 関数 (`escapeHtml`)、削除権限判定 pure 関数 (`canDeleteComment`)。
- **Route Handler テスト** (優先度中、SQLite テスト DB helper 未整備のため本 TDD スコープではスキップ、`§ 実装順序` 手順 6 で追加) … 独立 SQLite テスト DB。`getCurrentUser` を差し替え、3 ロール × (投稿者本人 / 他者投稿) の削除権限マトリクスを網羅する。
- **UI テスト** (優先度低) … `CardComments` の投稿 / 削除フロー、コメント領域が title / description 編集と独立に動くこと。

### ケース一覧 (spec/010_comment.md § 受入条件 との対応)

| 種別 | ケース例 | 対応 spec 節 |
|---|---|---|
| 正常系 (schema) | `{ body: "hello" }` → `{ body: "hello" }` (トリムしない) | § FR-01 / § バリデーション |
| バリデーション (schema) | `{}` → `422 required` / `{ body: "" }` → `422 required` / `{ body: "   " }` → `422 required` / `{ body: 123 }` → `422 invalid_type` / `{ body: "a".repeat(2001) }` → `422 too_long` | § バリデーション |
| 境界 (schema) | `{ body: "a" }` (1 文字下限) / `{ body: "a".repeat(2000) }` (2000 文字上限) / `{ body: "a".repeat(2001) }` (超過) | § 境界条件 |
| 境界 (schema) | `{ body: "  hi  " }` (先頭・末尾空白保持) → `{ body: "  hi  " }` | § 境界条件 |
| escape (pure) | `<` → `&lt;` / `>` → `&gt;` / `&` → `&amp;` / `"` → `&quot;` / `'` → `&#39;` / `<script>alert(1)</script>` → `&lt;script&gt;alert(1)&lt;/script&gt;` / 対象外文字 (絵文字 / 多バイト) はそのまま | § 非機能要件 § セキュリティ |
| escape (pure) | `&amp;` (既にエスケープ済み) → `&amp;amp;` (二重エスケープが起きることを明示的にテストし、呼び出し側で 1 回のみ呼ぶ責務を確認) | § 非機能要件 § セキュリティ |
| canDeleteComment (pure) | `owner` + 他者投稿 → `true` / `owner` + 自投稿 → `true` / `member` + 自投稿 → `true` / `member` + 他者投稿 → `false` / `viewer` + 自投稿 → `false` / `viewer` + 他者投稿 → `false` | § 権限境界 |
| 正常系 (Route Handler、後続) | 一覧 (0 件 / 複数件、`createdAt` 降順、同時刻 `id` 昇順)、投稿、投稿者本人による削除、owner による他者投稿削除 | § FR-02 / § FR-03 / § FR-04 |
| 権限 (後続) | `viewer` の `POST` = `403`、`viewer` の `DELETE` = `403`、`viewer` の `GET` = `200`、他ユーザー投稿の `member` `DELETE` = `403`、未参加 = `404` | § 権限境界 |
| 未存在 (後続) | 存在しない `cardId` の一覧 / 投稿 = `404`、存在しない `commentId` の削除 = `404` | § 異常系 |
| カスケード (後続) | Card 削除で配下 Comment が全消え | § データモデル |

### 補助ヘルパ

- `tests/helpers/factories.ts` (未整備) に `createComment(card, author, {body?, createdAt?})` を追加予定 (Route Handler テスト整備時)。
- `escapeHtml` の pure 単体テストは `tests/comments/escape.test.ts` に配置する (`tests/` 直下の既存 layer に合わせる)。
- `canDeleteComment` の pure 単体テストは `tests/auth/canDeleteComment.test.ts` に配置する。
- `parseCommentCreate` の pure 単体テストは `tests/schemas/comments.test.ts` に配置する。

## 実装方針 (本設計で固定する判断)

- コメントは 3 endpoint (`GET` / `POST` / `DELETE`) 構成に固定する。編集 API (`PATCH`) は本 spec 対象外のため実装しない。
- 一覧は `createdAt` 降順で返す (`spec/010_comment.md § 非機能要件 § 一覧の並び順`)。同時刻は `id` 昇順で解決する。
- HTML エスケープは保存時に Route Handler で 1 度だけ行う。schema はエスケープを行わず、元文字列の長さと型のみを検証する。
- 削除権限判定は `canDeleteComment` の pure 関数に切り出し、Route Handler は呼び出しのみに責務を絞る。
- コメント削除は物理削除方式 (`spec/010_comment.md § FR-03`)。復元 / 履歴保持は行わない。
- Card の `updatedAt` はコメント投稿 / 削除時に更新しない (`spec/010_comment.md § FR-01`)。
- `TargetType` の union に `"comment"` を追加する (`lib/log/audit.ts`)。既存の Board / List / Card のログには影響しない。
- クライアント UI では削除ボタンを「投稿者本人」 に限定表示する初期実装とする。owner による他者削除は API 経由で可能 (画面上の owner 判定は `ui-design/` と別 spec に委ねる)。

## 実装順序

1. **`design/001_boards.md` / `design/002_lists.md` / `design/003_cards.md` / `design/005_card_detail.md` (title / description 領域) の実装順序を先に完了させる**
   Board / List / Card 基本 CRUD、認証共通部品、カード詳細モーダルの基本構造 (`CardDetailModal`) が本設計の前提。
2. **Prisma スキーマ拡張と migration**
   `Comment` モデルを新設し、`User.comments` / `Card.comments` の relation を追加する 1 migration を流す (`prisma migrate dev --name add_comment`)。
3. **共通ユーティリティ**
   - `lib/log/audit.ts` の `TargetType` に `"comment"` を追加。
   - `lib/comments/escape.ts` の `escapeHtml(input)` を実装 (5 文字置換の pure 関数)。
   - `lib/schemas/comments.ts` を新設し `parseCommentCreate(body)` を実装 (型 / トリム後 1〜2000 文字検証)。
   - `lib/auth/commentAccess.ts` を新設し `resolveBoardFromComment(commentId)` を実装。
   - `lib/auth/canDeleteComment.ts` を新設し pure 関数を実装。
4. **Route Handler 実装**
   `app/api/cards/[cardId]/comments/route.ts` の `GET` → `POST` → `app/api/comments/[commentId]/route.ts` の `DELETE` の順で実装する。各 endpoint は `spec/000_shared_rules.md § Route Handler の入口チェック順序` に従う (1 認証 → 2 存在 → 3 権限 → 4 バリデーション → 5 業務)。
5. **UI コンポーネント接続**
   `CardComments` を新設し `CardDetailModal` のモーダル本体下部に配置する → `CardCommentForm` / `CardCommentRow` を接続する。既存の title / description 編集 state と分離した領域として実装する。
6. **テスト整備**
   pure 単体テスト (手順 3 の `parseCommentCreate` / `escapeHtml` / `canDeleteComment`) → Route Handler テスト (`§ テスト方針` のケース一覧を網羅) → UI テスト (領域独立性、投稿 / 削除フロー) の順で追加する。

## Red-Green-Refactor で扱う FR の順番

TDD (`/tdd` skill) で以下の順に Red-Green-Refactor を回す。前段で確立した pure 関数を後段で組み立てる依存関係。

1. **FR-01 (投稿) の schema バリデーション** (`parseCommentCreate`)
   - Red = 空 body / `body` 型不一致 / トリム後 0 文字 / 2001 文字が `ValidationError` を throw することを assert、正常値 (1 文字 / 2000 文字 / 先頭末尾空白保持) が受理されることを assert。
   - Green = `lib/schemas/comments.ts` を実装。
   - Refactor = 既存 `parseCardCreate` / `parseListCreate` と同じ zod パターン (`runSchema` helper) に揃える。
2. **HTML エスケープ pure 関数** (`escapeHtml`)
   - Red = 5 対象文字 (`&` / `<` / `>` / `"` / `'`) の置換、対象外文字 (英数 / 絵文字) がそのまま返ること、`<script>` を含む文字列の完全置換、既にエスケープ済み文字列は二重エスケープされる (呼び出し側責務) ことを assert。
   - Green = `lib/comments/escape.ts` を実装。
   - Refactor = 5 文字置換の map を module top-level に固定し、`replace` に関数コールバックを渡す形に統一。
3. **削除権限判定 pure 関数** (`canDeleteComment`)
   - Red = 3 ロール × 2 (自投稿 / 他者投稿) の 6 パターンで期待値を assert。
   - Green = `lib/auth/canDeleteComment.ts` を実装。
   - Refactor = 早期 return で 3 条件を単純化。
4. **FR-02 (一覧) は Route Handler フェーズで検証** (Prisma のクエリ順序に依存するため単体テスト化しない)。
5. **FR-03 / FR-04 (削除) は Route Handler フェーズで検証** (SQLite テスト DB helper 整備後、削除権限マトリクスを網羅)。

本 TDD スコープでは (1) (2) (3) の Red-Green-Refactor をユニットテストで完結させ、Route Handler / UI は `§ 実装順序` の手順 4 以降で順次追加する。Route Handler の追加は SQLite テスト DB helper (`tests/helpers/db.ts` 未整備) と連動して別 PR で実施する前提とする。

## 作成または更新したファイル

- `design/010_comment.md` (新規作成)
