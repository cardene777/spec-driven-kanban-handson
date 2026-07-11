# Docker環境

このDocker構成は、ハンズオンで使うNode.js、npm、Git、SQLiteの実行環境を揃えるための補助手段です。
Claude CodeはDockerに含めません。
Claude Codeはホスト側のターミナルに通常どおりインストールして使います。

## 含まれるもの

- Node.js 22
- npm
- Git
- SQLite CLI
- zsh / bash

## ファイル配置

Docker関連ファイルは以下にあります。

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.devcontainer/devcontainer.json`
- `docs/docker.md`

## 起動

サポートリポジトリのルートで以下を実行します。

```bash
docker compose up -d --build
```

コンテナに入る場合は以下を実行します。

```bash
docker compose exec handson zsh
```

## ハンズオンで使う

コンテナ内の作業ディレクトリは `/workspace` です。
対象ハンズオンのディレクトリへ移動して、書籍本文と同じコマンドを実行します。

```bash
cd minimum_handson/simple_prompt
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev -- --hostname 0.0.0.0
```

ブラウザでは以下を開きます。
ホスト側の公開ポートは、既存の開発サーバーと衝突しにくいようにデフォルトで32100にしています。

```text
http://localhost:32100
```

別のポートで開きたい場合は、起動時に `KANBAN_HANDSON_PORT` を指定します。

```bash
KANBAN_HANDSON_PORT=32101 docker compose up -d --build
```

## 停止

```bash
docker compose down
```

`node_modules` 用のDocker volumeも削除したい場合は以下を実行します。

```bash
docker compose down -v
```
