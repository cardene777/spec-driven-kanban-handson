# main_handson（教材 第5章）

カンバンアプリのハンズオン（教材 第5章分）です。運用モデルは `minimum_handson/` と同じです。

## 運用モデル

- **この `main_handson/` 直下が「常に最新の稼働アプリ」**です。
  作業と動作確認はここで行い、`node_modules` と `prisma/dev.db` を置きっぱなしにします。
- **各ステップの成果は、その時点のソースを `1_...` / `2_...` にコピーしたスナップショット**です（累積コピー）。

```
main_handson/
├── README.md
├── app/ lib/ prisma/ package.json ...  ← ★ 直下 = 常に最新の稼働アプリ（ここで作業）
├── 1_xxx/                               ← 各ステップのスナップショット（コピー）
└── 2_xxx/
```

（教材 第2章分は別ディレクトリ [`../minimum_handson/`](../minimum_handson/) にあります。）

## 一覧

| ステップ | ディレクトリ | 内容 | 状態 |
| --- | --- | --- | --- |
| - | （今後追加） | - | 予定 |

## 動かし方

`main_handson/` 直下で:

```bash
# 初回のみ（依存インストール + .env 作成 + DB 作成）
npm install
cp .env.example .env
npx prisma migrate dev

# 起動（2回目以降はこれだけ）
npm run dev
```

DB は直下の `prisma/dev.db` に保持されます（消さない限りデータは残ります）。

## スナップショットに含めないもの

`node_modules/`・`.next/`・`.env`・`prisma/dev.db`・`next-env.d.ts`（`.env.example` は含めます）。
