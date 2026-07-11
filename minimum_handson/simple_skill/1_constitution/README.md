# Simple 1: /constitution スキル

書籍 第 2 章「簡易スキルで仕様駆動する」の /constitution 呼び出し完了時点のスナップショット。

## このステップで追加したもの

- `.claude/skills/{constitution,spec,design,implement}/SKILL.md` = 書籍配布の 4 スキル
- `constitution.md` = プロジェクトルートに生成された Constitution

## 選択した回答 (書籍本文と同じ)

- プロジェクト概要 = 「シンプルなカンバン」 (Simple Kanban / タスクをカードで管理する最小構成のカンバンアプリ)
- 技術スタック = 「デフォルトで」 (Next.js + TypeScript + SQLite + Prisma + Tailwind CSS + Vitest + npm)
- 規模とセキュリティ = 「個人開発・認証なし」

## constitution.md の要点

- 技術スタック 6 項目
- 命名規則 / ファイル構成 / コメント方針
- シンプルさ優先 / 仕様駆動 / 異常系の網羅の 3 原則
- 個人開発向けセキュリティ要件 (認証なし、 機密データなし、 SQLite ローカル、 Prisma 経由)

## 補足

- subprocess 非対話モードで実行したため AskUserQuestion は発火せず、 事前に回答を prompt に含める形で進めた。 書籍本文の TUI 表示 (`☒ ☐ ✔` breadcrumb + 選択肢) は対話モードでのみ表示される
