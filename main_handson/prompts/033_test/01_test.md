/test

spec/009_assignee.md、design/009_assignee.md、lib/schemas/assignees.ts、lib/assignees/limit.tsを読み、tests/schemas/assignees.test.tsとtests/assignees/limit.test.tsが、`userId`の入力条件と人数上限を確認しているかを4つの観点で確認してください。

テストは次のコマンドで実行してください。

- npm run test -- 'tests/schemas/assignees.test.ts' 'tests/assignees/limit.test.ts'

次の条件を守って確認してください。

- 既存テストは削除せず保持してください。
- 正常系、異常系、境界条件、状態遷移の4つに分け、既存テストが対応する条件を示してください。同じ条件のテストは追加しないでください。
- 純粋関数で確認できない状態遷移は、追加しない理由と統合テストに必要な前提を記録してください。
- `tests/assignees/limit.test.ts`に、人数だけを渡すテストを「状態遷移」や「追加・削除後」と説明している箇所があれば、境界条件の説明へ直してください。
- 追加が必要な条件を見つけた場合は、実装を直す前に不足内容と対象ファイルを示してください。
- 作成または更新したファイル一覧、実行した確認コマンド、未実行の確認コマンドを最後に示してください。
