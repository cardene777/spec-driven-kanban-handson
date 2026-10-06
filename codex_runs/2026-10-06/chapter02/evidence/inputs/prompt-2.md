出典: 03_step1_prompt_only.md:131

```text
`/boards/[id]` で開くボード詳細ページを作ってください。

要件
- URLのボードIDからボード情報とリスト一覧を取得して表示する
- リストはid, title, order, boardId, createdAtを持ち、Prismaに追加する
- 同じボード内ではorderの昇順で並べる
- このハンズオンでは同時作成を扱わない。順番に作成した場合は、0件ならorderを0にし、以後は同じボード内の最大order+1を割り当てる
- 「リスト作成」ボタンを押すとフォームが出て、タイトルを入れて作成できる
- APIはGET /api/boards/[id]/lists, POST /api/boards/[id]/listsとして実装
- タイトルは前後の半角・全角空白、タブ、改行を除去してからJavaScriptのstring.lengthで1〜100文字を検証し、トリム後の値を保存する。空文字や100文字を超えるタイトルは保存せず、画面にエラーを表示する
- 存在しないボードIDにリストを作成または取得しようとした場合は404とする。作成時は、対象が存在する場合だけ400のバリデーションを行う
- エラー時のJSONは`{ "error": { "code": "...", "message": "..." } }`の形に統一する。存在しないボードには404と`NOT_FOUND`を返し、タイトルの検証エラーには400と`VALIDATION_ERROR`を返す
- Vitestで、存在しないボードの`GET /api/boards/[id]/lists`とPOSTが404と`NOT_FOUND`を返すことを確認する
```
