# 保存済み実行ログの位置づけ

このディレクトリには、第2章のハンズオンで Claude Code と Claude Opus 4.8 を用いた対話記録を置いています。公開用に、thinking、ローカルの絶対パス、利用者名、一時ディレクトリ名を除去または置換しています。

- `simple_prompt_session.raw.jsonl` は、Skillを使わず、4回のプロンプトで最小のカンバンアプリを作成した記録です。
- `simple_skill_session.raw.jsonl` は、`/constitution`、`/spec`、`/design`、`/implement` を順に依頼した記録です。

これらは対話の進み方を確認するための参考記録です。現在のSkill定義、依存関係、生成結果を保証するものではありません。完了の確認は、読者が実行したコマンド、生成物、テスト結果、画面操作で行ってください。

再実行した成果物は、`minimum_handson/simple_prompt/` と `minimum_handson/simple_skill/` にあります。
