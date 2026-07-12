# Simple Kanban - 第 5 章 メインハンズオン最終形

書籍第 5 章 (メインハンズオン) の 10 スキル (`/constitution` → `/spec` → `/design` → `/implement` → `/spec-review` → `/ui-design` → `/tdd` → `/test` → `/review` → `/document`) を通し実行して構築した完成形のスナップショット。

## 構成

- **spec/** = 15 file (000_shared_rules + 001-013 の機能仕様、 review 2 件)
- **design/** = 16 file (001-013 + 005-008 の Atomic Design、 UI 4 件)
- **app/** = 32 file (API 20 + UI 12、 Next.js App Router)
- **components/** = auth / boards / cards / invites / lists / members / comments
- **lib/** = prisma / schemas / repositories / auth / permissions
- **tests/** = 18 test file、 vitest run で 82 tests pass
- **docs/** = 9 file (api / help / runbook 各 3 = auth / member_invite / permissions)
- **prisma/** = User / Board / List / Card / Comment / CardAssignee / BoardMembership / Invite / Session の 9 モデル + 3 マイグレーション

## 動作確認

- `npm run lint` = pass
- `npx tsc --noEmit` = 0 errors
- `npm test` = 82 tests pass
- `npm run build` = production build OK
- `curl` = 401 (未認証) / 200 (認証済) / 422 (バリデーション) / 404 の各経路確認済

## セットアップ

```bash
cd main_handson
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
# http://localhost:3000 → /login (default@example.com / Default!123)
```

## 生成過程

- 全 10 skill を Claude Code CLI subprocess (`claude -p --output-format stream-json --verbose`) で実行
- 各 skill 実行 log と AskUserQuestion 発火状況は ai_books repo の `chapters/05_full_handson/logs/` に保存

## スナップショットに含めないもの

- `node_modules/` / `.next/` / `.env` / `prisma/dev.db` / `next-env.d.ts` / `tsconfig.tsbuildinfo`
- `inputs/` (書籍側 SSOT、 実行時に別途配置)
- `.context/` (TDD cycle 中間 file)
