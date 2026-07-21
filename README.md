# spec-driven-kanban-handson

Next.js、Prisma、SQLiteでカンバンアプリを段階的に作るハンズオンの成果物です。第2章・第5章で扱う、プロンプト駆動とスキル駆動の実装を収録しています。

> ルートに稼働アプリはありません。以下の各ハンズオンディレクトリへ移動して実行してください。

## 収録内容

| ディレクトリ | 内容 | スキル |
| --- | --- | --- |
| [`minimum_handson/simple_prompt/`](./minimum_handson/simple_prompt/) | 第2章。プロンプトだけで最小カンバンを作る版 | 使わない |
| [`minimum_handson/simple_skill/`](./minimum_handson/simple_skill/) | 第2章。同じ題材を4つの固定スキルで作る版 | `constitution`、`spec`、`design`、`implement` |
| [`main_handson/`](./main_handson/) | 第5章。認証・権限・UI・テスト・文書化まで拡張する版 | 11の汎用スキル |

各末端ディレクトリの直下が最新の稼働アプリです。`simple_prompt/` 内の `1_...` から `4_...` は、各ステップ完了時点のスナップショットです。

## 動かし方

Node.js 20.19以上（22系を推奨）、npm、Gitを用意します。起動したいハンズオンのディレクトリで次を実行します。

```bash
cd minimum_handson/simple_skill  # 実行したいディレクトリに置き換える
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

`http://localhost:3000` を開きます。SQLiteのデータベースは各ハンズオンの `prisma/dev.db` に作成されます。

## 技術スタック

- Next.js 16（App Router）/ React 19 / TypeScript
- Tailwind CSS v4
- Prisma 7.8（`@prisma/adapter-better-sqlite3` を使うadapter方式）/ SQLite
- Vitest 4（`simple_skill` と `main_handson`）

## 検証

`simple_skill` と `main_handson` では、各ディレクトリで次を実行できます。

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Docker環境

Node.js、npm、Git、SQLiteの実行環境をDockerでそろえる場合は、[Docker環境](./docs/docker.md)を参照してください。Claude Codeはホスト側に通常どおりインストールして使います。

## License

[MIT](./LICENSE)
