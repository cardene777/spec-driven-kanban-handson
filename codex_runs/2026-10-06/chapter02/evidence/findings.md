# 検証の発見

## Codex専用操作差

- 02_setup.md: Claude Code起動と/loginは本Codexセッションに読み替える。Claude認証・UIそのものは未検証。

- 04_step2_simple_skills.md:95〜106のスラッシュ候補表示は未確認。固定ZIPから4つのSKILL.mdを配置し、本セッションで実際に読み込む方法に置換した。
- /specのAskUserQuestionおよび各Skillの承認UIは、ユーザー指定の仮想読者回答に置換。案の原文・根拠・承認SHA256をsession.mdとproposals/へ保存してから書き出した。

## 書籍の問題

今回の検証では、本文の条件を変更しなければ進められない書籍問題は検出しなかった。

## 生成物・検証スクリプトの修正（書籍の問題とは区別）

| 出典と段階 | 入力 | 実際の結果 | 対応 |
|---|---|---|---|
| 03_step1_prompt_only.md:68、step1のテスト | inputs/prompt-1.md | 生成したtests/setup.tsがmigration_lock.tomlをディレクトリとして読んだ。test終了1、0件実行 | ディレクトリだけ列挙するよう生成コードを修正。再実行3件成功、終了0 |
| 03_step1_prompt_only.md:98〜112、step1画面確認 | ボード作成、空タイトル送信 | 確認スクリプトのalert locatorがアプリのpとNext route announcerの2件に一致。browser終了1 | アプリのp[role=alert]に限定。既に作ったボードを再利用し再実行成功 |

これらは本文の条件変更なしで修正できた。修正前の出力・終了コードと再実行結果はsession.mdに保存。

## 検証実行の制約不適合

- 位置: 02_setup.mdの準備後、npm/npxを使った初期化・依存追加。
- 入力: 本文指定の技術スタックの初期化。
- 実際: npm_config_cacheを継承し、WORK外の実行用一時HOMEにnpmキャッシュが書かれた。「変更はWORK内のみ」に不適合。ソース/DB/ブラウザバイナリはWORK内、書籍と配布リポジトリは読み取り専用のまま。
- 対応: 以後はWORK/.verification/npm-cacheへ固定。外部キャッシュは未公開、変更の巻き戻しは行わない。実行担当の不備として記録し、書籍の修正事項には数えない。
