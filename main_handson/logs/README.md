# 保存済み実行ログの位置づけ

このディレクトリには、第5章のハンズオンで Claude Code と Claude Opus 4.8 を用いた対話記録を置いています。公開用に、thinking、ローカルの絶対パス、利用者名、一時ディレクトリ名を除去または置換しています。

これらは対話の進み方を確認するための参考記録です。現在のSkill定義、依存関係、生成結果を保証するものではありません。完了の確認は、読者が実行したコマンド、生成物、テスト結果、画面操作で行ってください。

## セクション別のログ

| ログ | 対応セクション |
|---|---|
| `2_1_constitution.raw.jsonl`〜`2_4_implement.raw.jsonl` | セクション02（コアカンバン） |
| `3_1_spec.raw.jsonl`〜`3_4_implement.raw.jsonl` | セクション03（カード移動・アーカイブ・削除と復元） |
| `4_1_spec.raw.jsonl`〜`4_4_implement.raw.jsonl` | セクション04（カード詳細・ラベル・期限・検索・絞り込み） |
| `5_1_design_system.raw.jsonl` | セクション05（`/design-system`） |
| `6_1_spec.raw.jsonl`〜`6_4_implement.raw.jsonl` | セクション06（TDD） |
| `7_1_test.raw.jsonl` | セクション07（テスト） |
| `8_1_review.raw.jsonl` | セクション08（レビュー） |
| `9_1_spec.raw.jsonl`〜`9_8_document_help_runbook.raw.jsonl` | セクション09（認証・招待・権限・ドキュメント） |

現行手順で実行し直す場合は、既存のログを上書きせず、実行日とSkillの版が分かる別名で保存してください。本文へ数値やテスト結果を記載するときは、そのログと対応する生成物を照合します。
