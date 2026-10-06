出典: 03_step1_prompt_only.md:68

```text
ここは空のディレクトリです。Next.js（App Router）でカンバンアプリのボード一覧画面を作ってください。

セットアップ
- Next.js 16 + TypeScript + Tailwind CSS + App Router構成でプロジェクトを初期化する
- Prisma 7 + SQLiteを追加し、初期migrationとPrisma Clientの生成まで実行する
- Vitest 4を追加し、テストを実行できるようにする

要件
- ボードはid, title, createdAtを持つ
- データはPrisma + SQLiteで永続化する
- 一覧はcreatedAtの降順で表示する
- 「新規ボード作成」ボタンを押すとフォームが出て、タイトルを入れて送信するとボードが作成される
- タイトルは前後の半角・全角空白、タブ、改行を除去してからJavaScriptのstring.lengthで1〜100文字を検証し、トリム後の値を保存する。空文字や100文字を超えるタイトルは保存せず、画面にエラーを表示する
- 作成済みのボードカードを選ぶと`/boards/[id]`のボード詳細画面へ移動する
- APIはGET /api/boards, POST /api/boardsとして実装する
- エラー時のJSONは`{ "error": { "code": "...", "message": "..." } }`の形に統一し、タイトルの検証エラーは400と`VALIDATION_ERROR`を返す
- Vitestで、正常なボード作成、空のタイトルと101文字の半角英数字による400と`VALIDATION_ERROR`、ボードを追加しないことを確認する
```
