# simple_prompt — ステップ4: カード編集

第2章のプロンプト版ハンズオンで、カードタイトルのインライン編集まで完了した時点の最終スナップショットです。

このディレクトリ単体で起動できます。

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma generate
npm run dev
```

`http://localhost:3000` を開きます。ハンズオン全体の説明は親ディレクトリの[README](../README.md)を参照してください。
