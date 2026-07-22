# simple_prompt — プロンプトだけでカンバンアプリを作る

スキル（`/spec` 等）を使わず、現場のチケット程度の粒度のプロンプトだけで
Claude Code がどこまで作れるかを示すハンズオン。各ステップのプロンプトに
書かれていない要件（空文字の扱い・文字数上限・存在しない ID への 404 など）は
あえて作り込んでいない。「プロンプトだけだと要件が抜ける」ことを見せるための章。

## 技術スタック

- Next.js 16（App Router）+ TypeScript + Tailwind CSS
- Prisma 7（`@prisma/adapter-better-sqlite3` の adapter 方式）+ SQLite
- Node.js 20.19 以上 / npm

## 起動手順

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma generate
npm run dev
```

`http://localhost:3000` を開く。ビルド確認は `npm run build`。

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

各スナップショットも上記「起動手順」の 4 コマンドで単体起動できる。
