# simple_prompt — プロンプトだけでカンバンアプリを作る

スキル（`/spec`等）を使わず、4つのプロンプトだけで最小構成のカンバンアプリを作るハンズオン。各プロンプトに、タイトルの検証、存在しないIDへの404、JSONのエラー形式を条件として書き、生成したコードとテストで確認する。

## 技術スタック

- Next.js 16（App Router）+ TypeScript + Tailwind CSS
- Prisma 7（`@prisma/adapter-better-sqlite3`のadapter方式）+ SQLite
- Vitest 4
- Node.js 20.19 以上 / npm

## 起動手順

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma generate
npm run dev
```

`http://localhost:3000`を開く。検証は`npm run lint`、`npm run typecheck`、`npm run test`、`npm run build`の順に実行する。

## ステップと画面

| ステップ | 内容 | 主なファイル |
| --- | --- | --- |
| 1 | ボード一覧・新規ボード作成 | `app/page.tsx` / `app/api/boards` |
| 2 | ボード詳細・リスト作成 | `app/boards/[id]/page.tsx` / `app/api/boards/[id]/lists` |
| 3 | カード追加・表示 | `app/boards/[id]/new-card-form.tsx` / `app/api/lists/[id]/cards` |
| 4 | カードタイトルのインライン編集 | `app/boards/[id]/card-item.tsx` / `app/api/cards/[id]` |

## スナップショット

各ステップ完了時点のソース一式（`node_modules` / `.next` / `generated` /
`prisma/dev.db` / `.env` は含まない）:

- `1_board_list/`
- `2_board_detail/`
- `3_card_create/`
- `4_card_edit/`

各スナップショットは各ステップ直後の参考用ソースであり、最終版の入力検証、エラー処理、テストを含む完成アプリは`simple_prompt/`直下で確認する。
