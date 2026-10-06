# Simple Kanban — 独立した条件付き検証

書籍580719f、配布551f918、著者補足回答に基づく検証。初期Board/List/Cardのみ画面/API実装。後続機能は仕様・設計または担当者純粋関数に限定。

Node 20.19以上、npm。WORK内で実行：

```sh
export npm_config_cache="$PWD/.verification/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.verification/browsers"
mkdir -p .verification
npm ci
cp .env.example .env
npx prisma migrate deploy
npx prisma generate
npm run lint
npm run typecheck
npm run test
npm run build
npm run start
```

初期APIは認証・権限確認を常時通過。ローカル開発用。実測結果はevidence/result.md参照。

ブラウザの再検証（新しいローカルDBを使用し、サーバー起動後に実行）：

```sh
npx playwright install chromium
node verification-tools/http.mjs
node verification-tools/browser.mjs
node verification-tools/browser05.mjs
```

スクリプトは検証用Board/List/Cardを作成・削除します。初期ブラウザスクリプトは空ボード一覧を前提にします。typecheck/testとブラウザ操作を同時に実行しないでください。実測の途中失敗と修正はevidence/session.mdに記録しています。
