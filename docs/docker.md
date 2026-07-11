# Docker環境

このDocker構成は、ハンズオンで使うNode.js、npm、git、SQLiteの実行環境を揃えるための補助手段です。
書籍本文ではローカル環境を標準手順にしています。OSごとのインストールで詰まる場合や、同じNode.js環境で確認したい場合に使ってください。

## 含まれるもの

- Node.js 22
- npm
- git
- SQLite CLI
- zsh / bash

Claude Codeはホスト側のターミナルで実行する前提です。Docker内でClaude Codeを使う場合は、認証や設定ファイルの扱いが環境ごとに変わるため、各自の運用に合わせて設定してください。

## ファイル配置

Docker関連ファイルは以下にあります。

- `Dockerfile`
- `docker-compose.yml`
- `.devcontainer/devcontainer.json`
- `docs/docker.md`

## 起動

```bash
docker compose up -d --build
```

コンテナに入る場合は以下を実行します。

```bash
docker compose exec handson zsh
```

## ハンズオンで使う

コンテナ内の作業ディレクトリは `/workspace` です。
書籍の手順どおりに作業ディレクトリを作り、Node.jsやnpmの確認コマンドを実行できます。

```bash
node --version
npm --version
git --version
```

Next.jsの開発サーバーを起動する場合は、コンテナ内で以下を実行します。

```bash
npm run dev -- --hostname 0.0.0.0
```

ブラウザでは以下を開きます。
ホスト側の公開ポートは、既存の開発サーバーと衝突しにくいようにデフォルトで3001にしています。

```text
http://localhost:3001
```

別のポートで開きたい場合は、起動時に `KANBAN_HANDSON_PORT` を指定します。

```bash
KANBAN_HANDSON_PORT=3010 docker compose up -d --build
```

## 停止

```bash
docker compose down
```

node_modules用のDocker volumeも削除したい場合は以下を実行します。

```bash
docker compose down -v
```
