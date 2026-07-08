---
name: handson-structure
description: このリポジトリ（段階的ハンズオン）の構造・命名・DB/環境・ブランチ/PR運用の規約。ステップ追加、スナップショット作成、チャプターの起動、コミット/マージなど、このリポジトリで作業するとき常に従う。アプリの機能内容は対象外（構造の管理のみ）。
---

# ハンズオン・リポジトリ構造ガイド

このリポジトリを「段階的ハンズオン」として一貫管理するための規約。**何のアプリを作るか等の機能内容は扱わない。構造・運用のみ。**

## 1. 全体レイアウト

- **リポジトリのルートには実装コードを置かない。** ルートは説明用の `README.md` のみ。
- **ハンズオン = 稼働アプリを直下に持つ「末端ディレクトリ」**（例 `minimum_handson/simple_prompt/`）。
  関連するハンズオンは親ディレクトリでまとめてよい（例 `minimum_handson/` が `simple_prompt/` と `simple_skill/` を束ねる）。
- **各ハンズオン（末端ディレクトリ）の直下が「常に最新の稼働アプリ」**。スナップショットはその直下の `1_xxx/`, `2_xxx/`。

```
<repo>/
├── README.md                     ← ルートは説明のみ
├── .claude/skills/...            ← このスキル
├── minimum_handson/              ← ハンズオンを束ねる親
│   ├── README.md
│   ├── simple_prompt/            ← ハンズオン（末端）
│   │   ├── app/ prisma/ ...      ← ★ 直下 = 常に最新の「稼働アプリ」
│   │   ├── 1_xxx/                ← 各ステップのスナップショット（ソースのコピー）
│   │   ├── 2_xxx/
│   │   └── README.md
│   └── simple_skill/             ← ハンズオン（末端・同じ構成）
└── main_handson/                 ← ハンズオン（末端・同じ構成）
```

> ステップ番号は各ハンズオン（末端ディレクトリ）ごとに `1_` から始める（ディレクトリ間で通し番号にはしない）。

## 2. 稼働アプリ と スナップショット

各ハンズオン（稼働アプリを直下に持つ末端ディレクトリ。例 `minimum_handson/simple_prompt/`）は「稼働アプリ 1つ」＋「ステップのスナップショット複数」で構成する。

- **稼働アプリ = ハンズオンディレクトリ直下**（`app/` `prisma/` `package.json` などを直下に置く）。
  - ここで作業・動作確認する。**`node_modules` と `prisma/dev.db` は置きっぱなしにして保持**する
    → データが消えず、起動も速い。
  - **この `prisma/dev.db` は絶対に削除しない**（下記「やってはいけない」）。
- **スナップショット = ハンズオンディレクトリ直下の `1_xxx/`, `2_xxx/` …**（番号はステップ順の連番）。
  - あるステップが完成した時点の**ソースのコピー**。読み手はここを開けば、そこまでの完成コードを読める。
  - **累積**：各スナップショットは前ステップの内容をすべて含む（前段の正しいスーパーセット）。
  - **ソースのみ**。生成物・環境依存物は含めない（下記）。

### スナップショットに含める / 含めない

| 含める | 含めない（各自で生成） |
| --- | --- |
| `app/` `lib/` `prisma/schema.prisma` `prisma/migrations/` | `node_modules/` |
| `package.json` `package-lock.json` 各種設定ファイル | `.next/` |
| `.env.example` | `.env` |
| `README.md`（そのステップの説明・手順） | `prisma/dev.db` / `*.db-journal` / `next-env.d.ts` |

## 3. DB と 環境変数

- DB は各ディレクトリが**自前のローカル DB** を持つ。`.env.example` は必ず:
  ```
  DATABASE_URL="file:./dev.db"
  ```
  （`file:../../../dev.db` のような共有DBパスは使わない。過去に混乱の元になった。）
- `.env` はコミットしない。`.env.example` はコミットする（`.gitignore` に `!.env.example`、`*.db` を含める）。

## 4. スクリプトと起動（標準・自動化しない）

`package.json` の `scripts` は**標準の最小構成**にする。`predev`/`postinstall` などの自動化マジックは入れない。

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

各ディレクトリの起動手順（README にもこの4手順を明記する）:

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

- 稼働アプリ（ハンズオンディレクトリ直下）は初回だけこの4手順。以降は `npm run dev` だけで起動（環境が残っているため）。
- スナップショットを個別に動かす場合も同じ4手順が必要。

## 5. 新しいステップの進め方（サイクル）

1. **稼働アプリ（ハンズオンディレクトリ直下）で実装**し、`npm run dev` や `npm run build` で動作確認する。
2. 完成したら、直下の最新ソースを**次番号のスナップショットへコピー**する（生成物と既存スナップショットは除外）:
   ```bash
   # ハンズオンディレクトリ直下で実行
   rsync -a \
     --exclude node_modules --exclude .next --exclude .env \
     --exclude 'prisma/dev.db' --exclude 'prisma/dev.db-journal' \
     --exclude next-env.d.ts \
     --exclude '[0-9]*_*/' \
     ./ M_xxx/
   ```
3. 対象ハンズオンディレクトリの `README.md`（ステップ一覧）とルート `README.md` を更新する。
4. 下記のブランチ/PR運用でコミット〜マージする。

## 6. ブランチ / PR 運用

- **`main` に直接コミットしない。** 常に作業ブランチを切る。
- ブランチ名: 機能追加は `feat/...`、整理・リネーム等は `chore/...`。
- 手順:
  ```bash
  git checkout -b feat/xxx
  # 変更・コミット
  git add -A && git commit -m "…"
  git push -u origin feat/xxx
  gh pr create --base main --head feat/xxx --title "…" --body "…"
  gh pr merge <N> --merge --delete-branch
  git checkout main && git pull origin main
  ```
- コミットメッセージ末尾に Co-Authored-By トレーラ、PR 本文末尾に Claude Code のクレジットを付ける。
- 短時間に PR を連発すると GitHub のセカンダリ・レート制限に当たることがある。その場合は少し待って再試行する。

## 7. コミット前チェック

- `npm run build`（型チェック）を通す。
- 実際に `npm run dev` で起動し、対象の画面/APIが動くことを確認する。
- `git status` で **`dev.db` / `node_modules` / `.env` がステージされていない**ことを確認する。

## 8. やってはいけない（過去の失敗）

- ❌ 稼働アプリの `prisma/dev.db` を「クリーンアップ」で削除する（ユーザーのデータが消える）。**消さない。**
- ❌ ディレクトリ命名や章/ステップの区切りを、指示なく勝手に変える。命名・配置はユーザー指示に厳密に従う。
- ❌ `.env.example` に共有DBパスや自動セットアップなど「便利だが非標準」なコードを入れる。標準・最小に保つ。
- ❌ スナップショットに `node_modules` / `.next` / `.env` / `dev.db` を含めてコミットする。
