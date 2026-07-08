# 第4章: カードタイトルのインライン編集

カードのタイトルをクリックすると、その場で編集（インライン編集）できるようにするステップです。
編集してフォーカスを外すと自動で保存されます。

> このディレクトリには、**このステップ完了時点のコード全体**（第1〜3章を含む累積スナップショット）が入っています。
> そのままコピーすれば単体で動作します。

## このステップでやること

- API `PATCH /api/cards/[id]` を実装し、カードのタイトルを更新できるようにする
- カードを Client Component（`CardItem`）に切り出し、タイトルクリックで `<input>` に切り替える
- 入力後、**フォーカスを外したら（onBlur）自動保存**する（Enter でも保存、Escape でキャンセル）
- 保存後は `router.refresh()` で一覧を最新化する

※ このステップでは Prisma のスキーマ変更・マイグレーションはありません（`Card.title` を更新するだけ）。

## セットアップ手順

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

ボード → リスト → カードを用意し、カードのタイトルをクリック → 書き換え → 枠外をクリック（フォーカスアウト）で保存されます。

## 主なファイル（第3章からの追加・変更）

| パス | 役割 |
| --- | --- |
| `app/api/cards/[id]/route.ts` | `PATCH`（タイトル更新、404/400 対応） |
| `app/boards/[id]/CardItem.tsx` | インライン編集するカード（Client Component） |
| `app/boards/[id]/page.tsx` | カード描画を `CardItem` に置き換え |

## 動作確認（API）

```bash
# タイトルを更新
curl -X PATCH http://localhost:3000/api/cards/<cardId> \
  -H "Content-Type: application/json" \
  -d '{"title":"新しいタイトル"}'

# 存在しないカードは 404 / 空タイトルは 400
curl -i -X PATCH http://localhost:3000/api/cards/does-not-exist \
  -H "Content-Type: application/json" -d '{"title":"x"}'
```

## 補足

- 空文字や変更なしの場合は保存せず、元のタイトルに戻して表示に戻ります。
- 保存に失敗した場合も元のタイトルに戻します。
- Enter で確定（保存）、Escape で編集をキャンセルできます。
