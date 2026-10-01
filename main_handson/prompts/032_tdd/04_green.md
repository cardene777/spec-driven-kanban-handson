/implement

テスト先行モードで実装してください。

次のファイルを入力にしてください。

- spec/009_assignee.md
- design/009_assignee.md
- .context/tdd/cycles.md
- tests/schemas/assignees.test.ts
- tests/assignees/limit.test.ts

次の条件で実装してください。

- `lib/schemas/assignees.ts`と`lib/assignees/limit.ts`だけを作成してください。
- 既存テストと/tddが作成したテストは変更しないでください。
- 失敗テスト、仕様、設計で決めた振る舞いを満たす最小実装を書いてください。関数の内部構造は、テストを通すために必要な範囲で決めてください。今回はコードの整理を行わないでください。
- APIリクエストを受け取り、応答を返すRoute Handler、データベース、認証・権限、画面は実装しないでください。
- Prisma Clientが生成されていない場合は、型検査とビルドの前に`npx prisma generate`を実行してください。
- 対象テスト、全テスト、lint、typecheck、buildを実行し、結果を報告してください。
