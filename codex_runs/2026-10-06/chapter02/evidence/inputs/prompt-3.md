出典: 03_step1_prompt_only.md:200

```text
リスト内にカードを追加する機能を実装してください。

要件
- カードはid, title, description, order, listId, createdAtを持ち、Prismaに追加する
- descriptionは省略可能で、省略時はnullとする
- カード一覧はAPI GET /api/lists/[id]/cards、作成はPOST /api/lists/[id]/cards
- 同じリスト内ではorderの昇順で並べる
- このハンズオンでは同時作成を扱わない。順番に作成した場合は、0件ならorderを0にし、以後は同じリスト内の最大order+1を割り当てる
- リストの末尾に「カード追加」ボタンを置き、押すとタイトルを入れるフォームが出る
- カード作成後、リストの末尾にカードが追加されて見える
- タイトルは前後の半角・全角空白、タブ、改行を除去してからJavaScriptのstring.lengthで1〜200文字を検証し、トリム後の値を保存する。空文字や200文字を超えるタイトルは保存せず、画面にエラーを表示する
- 存在しないリストIDにカードを作成または取得しようとした場合は404とする。作成時は、対象が存在する場合だけ400のバリデーションを行う
- エラー時のJSONは`{ "error": { "code": "...", "message": "..." } }`の形に統一する。存在しないリストには404と`NOT_FOUND`を返し、タイトルの検証エラーには400と`VALIDATION_ERROR`を返す
- Vitestで、存在しないリストの`GET /api/lists/[id]/cards`とPOSTが404と`NOT_FOUND`を返すことを確認する
```
