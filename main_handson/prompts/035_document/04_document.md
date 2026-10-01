/document

認証・メンバー招待・権限管理のドキュメントを、APIリファレンス・ユーザーヘルプ・運用手順書の3種類まとめて生成してください。

次の仕様書を入力にしてください。

- spec/011_auth.md
- spec/012_member_invite.md
- spec/013_permissions.md

次の設計書を入力にしてください。

- design/011_auth.md
- design/012_member_invite.md
- design/013_permissions.md

次の実装を入力にしてください。

- app/api/auth/
- app/api/boards/[boardId]/members/

次のテストを入力にしてください。

- tests/auth/

次の画面を入力にしてください。

- app/login/
- app/signup/
- app/boards/[boardId]/members/

次の運用設定を入力にしてください。

- package.json
- .env.example
- prisma/

次の条件でドキュメントを出力してください。

- `docs/api/`には、APIごとにHTTPメソッド、パス、入力、出力、ステータスコード、権限、関連テストを分けて書いてください。
- `docs/help/`には、画面操作、エラーメッセージ、対処法、よくある質問を分けて書き、API内部の実装用語は画面上の表現に言い換えてください。
- `docs/runbook/`には、障害シナリオ、確認手順、復旧手順、ログ確認、関連ファイルを分けて書き、実装に存在しないログやメトリクスは不足項目として分けてください。
- 仕様・設計・実装・テスト・画面・運用設定の間に矛盾がある場合は、ドキュメントへ断定的に書かず警告として分ける。
- 書き出す前に、作成または更新するファイル、上書きの有無、入力間の矛盾を示して確認を求める。
- 作成または更新したファイル一覧を最後に示してください。
