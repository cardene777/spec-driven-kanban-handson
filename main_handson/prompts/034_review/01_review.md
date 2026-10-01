/review

以下の範囲だけを5観点で照合してください。

次の仕様書と設計書をレビュー対象にしてください。

- inputs/009_assignee_tdd_review_scope.md

実装は次のファイルを確認してください。

- lib/schemas/assignees.ts
- lib/assignees/limit.ts

テストは次のファイルを確認してください。

- tests/schemas/assignees.test.ts
- tests/assignees/limit.test.ts

次の内容を確認してください。

- `userId`が文字列であり、前後の空白を除いた後に1文字以上ある場合だけ受け付けること
- 担当者が9人なら追加を許可し、10人なら拒否すること
- `assignee`、`userId`、人数上限の用語が一致すること

権限境界は、APIと認証を実装していないため対象外とレポートに書いてください。
カードへの保存、API、認証、画面については、未検証範囲として書いてください。

レビュー結果は次の条件で出力してください。

- レビュー結果はreview/009_assignee_review.mdに書いてください。
- 仕様、実装、テストは変更しないでください。
- 不一致ごとに、観点、対象ファイル、確認した事実、修正案を分けて書いてください。
