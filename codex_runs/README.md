# Codexによる書籍ハンズオン再検証

CHAPTER 02・CHAPTER 05を、過去のClaude Code実行から独立したCodex CLIセッションで検証した成果物です。書籍側の管理Issueは [ai_books#135](https://github.com/cardene777/ai_books/issues/135) です。

各章の開始時、空の作業ディレクトリと認証情報だけを持つ一時的な`CODEX_HOME`を用意しました。`--ephemeral --ignore-user-config --ignore-rules`を指定し、個人のRules・Skills・AGENTS.mdは入力にしていません。書籍が指示するSkillだけを固定コミットの配布ZIPから配置しました。Codex本体の標準指示は残ります。

- [`2026-10-06/chapter02/`](2026-10-06/chapter02/)：プロンプト版とSkill版を１つのセッションで実行したコード、仕様、設計、検証記録。
- [`2026-10-06/chapter05/`](2026-10-06/chapter05/)：固定コミットでは第3節まで、現行配布コミットを使う条件付き再検証では第8節まで実行した生成物と検証記録。第9節の文書生成・照合と第10節は未検証です。

各結果はCodexへClaude Code用プロンプトを読み替えて実行したものです。Claude CodeのスラッシュコマンドUIやログイン手順の再現結果ではありません。`.env`、SQLite DB、依存パッケージ、ブラウザバイナリ、認証情報、生の対話ログは収録していません。
