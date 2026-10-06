# CHAPTER 02 検証結果

書籍コミット：`580719fe7ec6852cd620ae14a66e6fb1bb561ac2`
配布ZIPコミット：`4d0ce45b52df4290fb80a3eda0d5f661761aa216`

空の`prompt/`と`skill/`から、同じクリーンなCodexセッション内で順に作成しました。`skill/`へは固定ZIPの4つのSkillだけを初期配置し、既存の完成例は使用していません。承認が必要な場面では、本文に指定済みの条件だけを検証上の読者回答として承認し、案と根拠を`evidence/`へ記録しています。

プロンプト版はVitest 9件、Skill版は18件に成功しました。両版でlint、型チェック、ビルド、ブラウザ操作とAPI・SQLiteの確認が成功しています。書籍に必須の修正は検出されませんでした。詳細は[結果](evidence/result.md)と[実行記録](evidence/session.md)を参照してください。

`evidence/inputs/`には入力の出典とSHA-256だけを収録しています。書籍掲載プロンプトの全文は収録していません。再実行時は書籍の該当箇所を使用してください。

実行時のNode.jsは24.15.0、npmは11.12.1でした。再実行する際は各アプリのディレクトリで`npm install`、`.env.example`からの`.env`作成、`npx prisma migrate dev`、`npx prisma generate`を行ってください。各アプリの`package.json`に検証用のnpm scriptsがあります。
