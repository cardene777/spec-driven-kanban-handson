# spec-driven-kanban-handson

本書のCHAPTER 02・CHAPTER 05で使う**配布ハンズオンリポジトリ**です。Next.js、Prisma、SQLiteでカンバンアプリを段階的に作るための、プロンプト駆動とスキル駆動の成果物を収録しています。

> ルートに稼働アプリはありません。以下の各ハンズオンディレクトリへ移動して実行してください。

## 収録内容

| ディレクトリ | 内容 | スキル |
| --- | --- | --- |
| [`minimum_handson/simple_prompt/`](./minimum_handson/simple_prompt/) | CHAPTER 02。プロンプトだけで最小カンバンを作る版 | 使わない |
| [`minimum_handson/simple_skill/`](./minimum_handson/simple_skill/) | CHAPTER 02。同じ題材を4つの汎用スキルで作る版 | `constitution`、`spec`、`design`、`implement` |
| [`main_handson/`](./main_handson/) | CHAPTER 05。認証・権限・UI・テスト・文書化まで拡張する版 | 基本4 Skillと、CHAPTER 05用の追加7 Skill（`design-system` を含む） |

各末端ディレクトリの直下が最新の稼働アプリです。`simple_prompt/` 内の `1_...` から `4_...` は、各ステップ完了時点のスナップショットです。

## 動かし方

Node.js 20.19以上（22系を推奨）、npm、Gitを用意します。起動したいハンズオンのディレクトリで次を実行します。

```bash
cd minimum_handson/simple_skill  # 実行したいディレクトリに置き換える
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma generate
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

## 実行ログ

本書で実行した対話ログを、再現手順の参考記録として収録しています。thinkingとローカルパスは公開版から除いています。ログ自体を完了判定には使わず、手元で生成した成果物と検証コマンドの結果を確認してください。

- [CHAPTER 02の正式ログ](./minimum_handson/logs/)
- [CHAPTER 05のセクション別ログ](./main_handson/logs/)

## Docker環境

Node.js、npm、Git、SQLiteの実行環境をDockerでそろえる場合は、[Docker環境](./docs/docker.md)を参照してください。Claude Codeはホスト側に通常どおりインストールして使います。

## License

[MIT](./LICENSE)
