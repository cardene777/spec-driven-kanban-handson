# Simple 4: /implement スキル

書籍 第 2 章「簡易スキルで仕様駆動する」の /implement 呼び出し完了時点のスナップショット。 constitution / spec 5 file / design 1 file を読んで、 カンバン全体を一括生成した最終形。

## このステップで追加したもの

### API ルート (`app/api/`)

- `app/api/boards/route.ts` = GET (`{ boards }` 降順) / POST (`{ board }` 201)
- `app/api/boards/[id]/lists/route.ts` = GET / POST (404 優先、 未知 boardId → 404 のみ)
- `app/api/lists/[id]/cards/route.ts` = GET / POST (404 優先)
- `app/api/cards/[id]/route.ts` = PATCH (title のみ更新、 他 field は無視)

### UI (`app/`)

- `app/layout.tsx` (Kanban 用に置き換え) / `app/page.tsx` (Server Component)
- `app/_components/BoardListView.tsx` = 一覧グリッド + 新規作成フォーム
- `app/boards/[id]/page.tsx` = 詳細 (`notFound()` 分岐)
- `app/boards/[id]/_components/BoardDetailView.tsx` = カンバン列 + リスト作成 + カード作成
- `app/boards/[id]/_components/CardItem.tsx` = インライン編集 (blur 保存、 Enter / Escape、 同値スキップ)

### lib (`lib/`)

- `lib/prisma.ts` = PrismaClient singleton
- `lib/validation.ts` = title 境界値 (Board/List 1-100、 Card 1-200)、 trim 判定
- `lib/errors.ts` = `{ error: { code, message } }` の統一 form
- `lib/repository/{boards,cards,lists}.ts` = データアクセス層

### テスト (`tests/`)

- `tests/validation.test.ts` = 境界値 (1/100/101, 1/200/201, trim 後 0 文字, 非文字列)
- `tests/api/lists.test.ts` = 404 単独 / 404 vs 400 優先 / 400 / 正常系 (trim)
- `tests/api/cards-patch.test.ts` = 404 単独 / 404 vs 400 優先 / description/order/listId 無視 / 201 文字 400
- `tests/repository/order.test.ts` = order=0 (空) / order=+1 (既存)

## 動作確認結果

| コマンド | 結果 |
|---|---|
| `npx prisma migrate dev --name init` | Success |
| `npm run lint` | 0 error |
| `npm run typecheck` | 0 error |
| `npm test` (vitest run) | **4 files / 21 tests passed** |
| `npm run build` | 7 routes 生成 |
| curl 15 ケース (正常 6 / 400 4 / 404 4 / PATCH ignore 1) | 全て設計通り |

## プロンプト版との差 (書籍執筆用)

| 観点 | プロンプト版 | スキル版 |
|---|---|---|
| API response wrap | 生 object 直返し | `{ boards }` / `{ board }` 形式で統一 |
| Error 形式 | `{ error: "..." }` (単純) | `{ error: { code, message } }` (統一) |
| 検証層 | route 内で inline | `lib/validation.ts` に集約 |
| Repository | Prisma 直呼び | `lib/repository/*.ts` に集約 |
| test | なし | validation + api + repository 21 tests |

## 補足

- README.md は退避 → create-next-app → 復元の手順で保持
- 実装範囲外 (削除・編集・DnD・認証) は一切追加していない
- AskUserQuestion 発火数 = 0 (pre-fill で bypass)
