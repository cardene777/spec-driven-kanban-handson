# CHAPTER 05 検証結果

書籍コミット：`580719fe7ec6852cd620ae14a66e6fb1bb561ac2`
配布ZIPコミット：`9764131d98562e29a1c168e83fcbbbf412ff5740`

各試行は、空の作業ディレクトリと個人設定を読み込まない新しいCodexセッションから始めました。本文と固定ZIPを入力とし、既存の完成アプリは初期入力に使っていません。本文にない判断で停止した記録を`baseline/`（削除権限）と`baseline_description/`（空の説明文）に保存しています。

著者が確定した「List/Card削除はmember以上」「Card.descriptionは空文字を許可」を追加の読者回答として与えた結果が`conditional/`です。第1〜3節を完了し、第4節の本文と固定入力が担当者・コメントの対象範囲について矛盾したため仕様生成前に停止しました。第5〜10節は未検証です。第8・9節で指定する2つの入力ファイルも固定ZIPにないことを静的に確認しました。

`conditional_current/`は配布コミット`551f918a44eeeba57ad427176849f7775f1a0072`を使い、別のクリーンなセッションで空のディレクトリからやり直した条件付き検証です。第1〜8節を通過し、第9節の成果物確認表が前節で作成を指示していないファイルを求めるため停止しました。第9節の文書生成・照合と第10節は未検証です。[結果](conditional_current/evidence/result.md)と[問題箇所](conditional_current/evidence/findings.md)を参照してください。

初期アプリはlint、型チェック、Vitest 8件、ビルド、HTTP 36件、ブラウザ16チェックが通りました。詳細は[結果](conditional/evidence/result.md)と[問題箇所](conditional/evidence/findings.md)を参照してください。

`conditional/`には公開候補として検証した89ファイル、`conditional_current/`にはハッシュを検証した候補148ファイルとmanifestを収録しています。`.env`、SQLite DB、依存パッケージ、生成Client、ブラウザ、キャッシュ、生ログ、個人用パスは含めていません。第3節で作った追加仕様は初期アプリへ実装していません。
