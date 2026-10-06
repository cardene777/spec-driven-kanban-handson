# CHAPTER 05 独立読者検証結果

固定本文580719fe7ec6852cd620ae14a66e6fb1bb561ac2、固定配布9764131d98562e29a1c168e83fcbbbf412ff5740。空アプリWORKから自身で生成した。本文外の著者回答（List/Card削除member以上、description空文字許可・最大2000文字）を適用している。本文だけでの完走ではない。

**Section 04の仕様生成前で停止。全章完走は未達。** 本文がコメント検索・担当者絞り込みを要求する一方、固定ZIP入力は明示的に含めないよう指示する。利用者の機能・受入範囲が変わるため、通常の設計裁量として選択しなかった。

| 節 | 結果 | 実際に確認した範囲 |
|---|---|---|
| 01 | 完了 | 初期CRUD/順序/詳細ダイアログと後続設計範囲を確定、固定ZIP入力配置 |
| 02 | 完了 | constitution→spec→design→implement、依存・migration・Client・静的検査・HTTP・画面 |
| 03 | 完了（仕様・設計のみ） | 追加spec→spec-review→本文回答反映→再レビュー→design。追加コード未実装 |
| 04 | 停止 | 本文・固定入力の直接矛盾。005〜008仕様とUI設計を未生成 |
| 05 | 未確認 | デザインシステム導入・build済アプリ画面操作は未実行 |
| 06 | 未確認 | 担当者仕様/設計・RED/GREEN/REFACTOR未実行 |
| 07 | 未確認 | 担当者テスト照合・追加は未実行、追加件数を報告しない |
| 08 | 未確認 | /review未実行。指定入力欠落はZIP一覧で静的確認 |
| 09 | 未確認 | /document・参照文書読込/照合未実行。指定入力欠落は静的確認 |
| 10 | 未実行 | 全章の振り返りはできない。下記初期範囲だけ部分評価 |

## 実測

Node24.15.0、npm11.12.1、Next16.3.8（webpack）、Prisma7.10.0（SQLite adapter）、Vitest4.1.11。

| 確認 | 最終結果 |
|---|---|
| create-next-app@16 --webpack --disable-git | 終了0、WORK内で新規生成 |
| npm install | 終了0、キャッシュ.verification/npm-cache |
| prisma migrate dev --name init | 終了0、migration作成・ローカルSQLite適用 |
| prisma generate | 終了0、generated/prisma作成 |
| npm run lint | 終了0 |
| npm run typecheck | 終了0 |
| npm run test | 終了0、1ファイル8件PASS |
| npm run build | 終了0、初期画面/APIのルート生成 |
| HTTP | 36リクエスト終了0、期待statusとrequestId全一致 |
| ブラウザ | core確認7チェック、CRUD補足9チェック終了0 |
| サーバー停止 | dev停止は終了0、最終startはSIGINT停止で終了130 |

HTTPでCRUD、Board/List/Cardのtitle最小/最大/空/超過、descriptionの0/2000/2001文字、404、orderの負数/非整数/範囲外、並び順、cascadeを確認。結果はhttp-core.json。最終build後のstartでも36件を再確認した（初回と合わせHTTP72件）。

ブラウザで空状態、Board ID入りURL、Board→List→Card作成、カード詳細題名/説明、編集保存後reloadして一致、Esc閉じるとfocus復帰、Board/List名称変更、List/Card並び替え、Card→List→Board削除を確認。core実行中のpageerrorは0。browser-core.json、browser-crud.jsonと自身で撮影した3枚の画面を保存。最後の実装変更後、ビルド済み初期アプリでも同じ7＋9チェックを再実行して成功した。

操作ログはHTTPのrequestIdとサーバーJSONログで対応を確認。性能200/300msは本文が測定しない設計目標とするため達成判定しない。500エラーログの意図的障害注入、認証・403境界、追加API、担当者、デザインシステム、参照文書は未確認。

自身の共通CRUDがBoardにもorder更新を含めたため、最終段階で本文の範囲に合わせてtitle編集だけへ訂正した。List/Card並べ替えと画面は変更していない。

初回migration127、lint1、typecheck2およびブラウザ試行の失敗をsession/findingsへ記録し、成功で上書きしていない。devの一時的JSON.parse/500はキャッシュ再生成後再発していないが原因未確定。説明欄待ちtimeoutは確認locatorの不備で修正した。

Section03レビューは自分の暫定仕様から6件（High4/Middle2/Low0）を算出。更新後にその6条件を再確認。更新済specと初期コードに差があるのは本文の対象範囲どおり。物理削除の初期仕様写しをevidence/core-spec-initialへ保存し、追加specのsoft-deleteを初期実装済みと扱わない。

## 必要な書籍修正

詳しい根拠・行・最小修正案はfindings.md。

1. Section04と固定配布005_008入力の担当者・コメント範囲を統一し、整合するコミットを配布URLへ反映する（今回の停止条件）。
2. Section08の009_assignee_tdd_review_scope.md、Section09の011_auth_design_input.mdを配布へ追加するか、本文に掲載内容から作成する手順を加える（未到達箇所の静的確認）。
3. 著者補足した初期List/Card削除権限とdescription空文字許可を元の実行プロンプト・入力に明記する。

表現の好みによる改善は含めない。

## 再現

README.mdとverification/のスクリプトを使用。新しいローカルDBを作り、環境変数DATABASE_URL=file:./prisma/dev.db、WORK内npmキャッシュでnpm ci→prisma migrate deploy→prisma generate→lint→typecheck→test→build。devをport3105で起動する。

WORK内.verification/browsersにPlaywright Chromiumを導入する。確認用の空DBから、HTTPスクリプト→ブラウザcore→ブラウザCRUDの順に実行する。同じDBを変更する確認を並行実行しない。HTTPは自分の作成対象を削除する。ブラウザcoreは確認用の読者ボードを残し、CRUDはそれを操作して削除する。

停止条件の再現には、04_ui_design.md 41/65/286行と固定入力005_008_ui_features_spec_input.md 27/51行を照合する。本文/配布のどちらを正とするかの追加判断なしでは、同時適用できない。

## 公開候補

evidence/public-candidates.md、evidence/public-manifest.jsonに候補とハッシュを記す。生ログ、.env類、DB、node_modules、generated Client、ブラウザ、.next、.verification、個人絶対パスは候補に含めない。公開・commit・push・Issue/PR・デプロイは行っていない。
