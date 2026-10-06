# 条件付き検証結果

**第1〜8節を完了し、第9節の成果物確認表と前節の指示の矛盾で停止した。完走ではない。**

書籍コミット580719fe7ec6852cd620ae14a66e6fb1bb561ac2、配布551f918a44eeeba57ad427176849f7775f1a0072。本文指定9764131を使用した検証ではない。削除権限member以上とdescription空文字許可は本文外の著者回答を使用した。

|節|判定|確認したこと|
|---|---|---|
|01|完了|空WORK、固定コミット、初期コピー.claude/inputs、実装範囲確定|
|02|完了|constitution→spec→design→implement、依存・migration・Client、3画面とHTTP|
|03|完了|暫定仕様、7指摘のレビュー、本文選択反映、再レビューと設計。新機能未実装|
|04|完了|4仕様/4設計、1つのAtomic Design UI設計。後続画面/API未実装|
|05|完了|shadcn5部品、brand/tokens/AppShell、production CRUDとDialog|
|06|完了|Red、Green対象10件/全17件、誤ガード検出、Refactorテスト不変|
|07|完了|既存10保持、7追加、対象17件/全24件。状態遷移は対象外|
|08|完了|指定純粋関数範囲の5観点レビュー、不一致0、権限境界対象外|
|09|停止・未実行|全文/前後/入力確認で旧UI分割と未依頼コメント成果物の矛盾。認証生成と/document・参照文書照合未実行|
|10|未確認|停止後の振り返り評価は実行していない。前後確認のため本文は読んだ|

## 実測

|検査|実測結果|
|---|---|
|依存・migration・Prisma生成|exit0、Prisma7.10.0、Next16.3.8、Vitest4.1.11、shadcn CLI4.21.3|
|初期lint/typecheck/test/build|順にexit0、test7/7|
|第5節build/lint/test|exit0、7/7|
|第6節Red|対象モジュール未実装による2収集失敗、exit1、アサーション実行0。既存7件は0|
|Green|対象10/10・全17/17、lint/typecheck/build0|
|隔離誤変更|人数ガード&&で1失敗/4成功、exit1|
|Refactor|対象10/10・全17/17、既存テストhash一致|
|第7節最終|対象17/17・全24/24、lint0、typecheck0、build0。途中BigInt記法の型2/build1は修正済み|
|HTTP|11リクエストで201/200/204/404/422とrequestIdを実測（http02.json）|
|初期ブラウザ|空ボード、作成、実ID URL、List/Card作成、詳細題名説明編集・再表示・Tab/Escを実測|
|第5節productionブラウザ|最近ボード同URL、CRUD、説明保存、Tab内包/Esc。OS light/darkとも背景rgb(250,246,238)、見出しは指定serif|
|性能/ロール/後続API画面|未測定・未実装。純粋関数成功を担当者機能全体の成功としていない|

初期カードDELETEは物理削除のまま。第3節以降のソフト削除/移動等は仕様設計だけであり、コードへ反映していない。ラベル色、期限基準タイムゾーン、検索の正規化/結合条件は未決事項で、実装に使用していない。

## 必要な書籍修正

停止原因は09_document.md 281〜319行の確認表。コメントspec/design010を除外し、4つの個別UI設計を005_008_ui_features_ui.mdに置換、design004を含める。加えて、今回補足した削除権限/description条件を元プロンプトへ明示し、10節のログ範囲を初期実装と一致させる。詳細はfindings.md。

## 再現手順

1. 空WORKで書籍580719feの01→10を順に使用する。今回は配布551f918のZIP取得、.claudeとinputsだけコピーした。
2. コピーした各SKILL.md全文と本文プロンプトを適用し、session.mdの承認/著者補足を入力する。完成例は実装材料にしない。
3. 初期アプリの再セットアップはREADME.md。npmキャッシュ・ブラウザはWORK/.verificationへ。migration deploy→Client生成→lint→typecheck→test→build。
4. HTTP/ブラウザ操作の再実行用スクリプトはverification-tools/。先に生成データのないローカルDBとdev/startサーバーを用意する。テストはBoardを削除するため、ブラウザ確認と同時実行しない。
5. 第9節確認表を03/04の出力指定と照合すると、未依頼010と4個別UI設計の要求を再現できる。追加生成で矛盾を隠さない。

## 成果物

公開候補manifestはpublish-candidates.json。候補の存在・SHA256・除外対象・個人絶対パスを確認した。公開・commit・push・Issue/PR・deployは行っていない。
