# Simple Kanban — 独立読者検証

CHAPTER 05の初期範囲から新規生成したローカルアプリ。認証・ロール確認は実装しない。
初期CRUD、親内並び順、カード題名・説明編集だけを実装する。追加機能は仕様・設計のみ。
検証の完了/停止範囲はevidence/result.mdを参照。

## 再現

Node.js 20.19以上（検証時24.15.0）、npmを使う。

```sh
npm_config_cache="$PWD/.verification/npm-cache" npm ci
```

DATABASE_URLを`file:./prisma/dev.db`に設定する（ローカルDBのみ）。

```sh
npm_config_cache="$PWD/.verification/npm-cache" npx prisma migrate deploy
npm_config_cache="$PWD/.verification/npm-cache" npx prisma generate
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev -- --port 3105
```

テストは専用`.verification/test.db`を作成する。`.verification`を先に作成する。
`tests/core.test.ts`は初期仕様の検証。Section 03で追加したソフト削除・アーカイブは未実装である。

## HTTP・ブラウザの再現

確認用の空DBを使い、同じDBへ並行実行しない。devサーバー起動後に次を順に実行する。

```sh
mkdir -p .verification
PLAYWRIGHT_BROWSERS_PATH="$PWD/.verification/browsers" npm_config_cache="$PWD/.verification/npm-cache" npx playwright install chromium
python3 verification/http-core.py
PLAYWRIGHT_BROWSERS_PATH="$PWD/.verification/browsers" node verification/browser-core.cjs
PLAYWRIGHT_BROWSERS_PATH="$PWD/.verification/browsers" node verification/browser-crud.cjs
```

ブラウザcoreが作る確認用ボードを、続くCRUDスクリプトが操作・削除する。
