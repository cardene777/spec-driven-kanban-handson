# simple_skill

カンバンアプリを**スキルで進める版**のハンズオンです。

運用モデルは `simple_prompt/` と同じ:
- **この `simple_skill/` 直下が「常に最新の稼働アプリ」**（`node_modules` と `prisma/dev.db` を保持）。
- 各ステップの成果は `1_.../2_...` にソースをコピーしたスナップショットとして残す。

```
simple_skill/
├── README.md
├── app/ prisma/ ...   ← ★ 直下 = 常に最新の稼働アプリ（ここで作業）
└── 1_xxx/             ← 各ステップのスナップショット
```

## ステップ一覧

| ステップ | ディレクトリ | 内容 | 状態 |
| --- | --- | --- | --- |
| - | （今後追加） | - | 予定 |

## 動かし方

`simple_skill/` 直下で:

```bash
# 初回のみ
npm install
cp .env.example .env
npx prisma migrate dev
# 起動（2回目以降はこれだけ）
npm run dev
```
