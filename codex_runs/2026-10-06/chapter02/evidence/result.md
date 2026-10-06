# CHAPTER 02 読者検証結果

検証日: 2026-10-06。独立した新規Codexセッション。
書籍: `580719fe7ec6852cd620ae14a66e6fb1bb561ac2`。
配布ZIP: `4d0ce45b52df4290fb80a3eda0d5f661761aa216`。

## 判定

| 対象 | 判定 | 実測結果 |
|---|---|---|
| プロンプト版 step1〜4 | 完了 | 原文4入力を順に適用。初期/追加migration・Client生成成功。最終Vitest 9件、lint・typecheck・test・buildは終了0 |
| Skill版 constitution/spec/design/implement | 完了 | 固定ZIPのskillsのみ配置。案・根拠・模擬承認を保存してから書き出し。初期migration・Client生成成功。Vitest 18件、4検証コマンドは終了0 |
| ブラウザ操作 | 完了 | Playwright + headless Chromiumで実行。両版のボード/リスト/カード作成、詳細へクリック遷移、横/縦並び、タイトルクリック編集、blur保存、空/上限超過の画面エラー、追加/更新なし、reload保存を確認 |
| API・SQLite | 完了 | 7 APIの成功系、400 VALIDATION_ERROR、404 NOT_FOUNDと欠損対象の判定優先、order、description=null、保存データを照合。HTTP応答と実DBのschema/件数/migration結果を記録 |
| Claude Code専用UI・認証 | 未確認 | 本Codexセッションへの入力とSKILL.md読み込みに置換。/login、スラッシュ候補表示、Claude Code自体による生成の再現は検証していない |
| 作業領域内のみ変更する制約 | 失敗（不適合1件） | 依存導入時に継承npmキャッシュがWORK外の実行用一時HOMEへ書き込まれた。後続はWORK内に固定。書籍・配布リポジトリは変更していない |

両版のアプリ検証は完了したが、実行制約まで含めた完全合格とは判定しない。
人間による手動の見た目評価は未実施。実際に行ったブラウザ自動操作とHTTP確認をsession.mdで区別した。

## 書籍の修正がどうしても必要な点

今回の実行では見つからなかった。生成テスト初期化とブラウザ確認スクリプトの失敗は、本文の条件を変更せず修正できた。npmキャッシュの制約不適合は実行担当の不備であり、書籍の問題には数えない。

## 記録と成果物

- session.md: 環境・clean確認、入力、実行コマンド・終了コード、観察結果、修正前の失敗、承認根拠。
- findings.md: Codex専用操作差、生成物の修正、実行制約不適合。
- inputs/: 本文の8入力の原文と位置。
- proposals/: 独立生成した案。session.mdに模擬承認とSHA256。
- file-manifest.tsv: 新規生成ソース・仕様・設計・記録の一覧とSHA256。
- public-artifacts.txt: 公開用ZIPの対象一覧。

公開用ZIPは `.env`、DB本体、node_modules、生成Client、ブラウザバイナリ、キャッシュ、既存provenance.txt、個人の絶対パスを含めない。これらの実行用データは公開対象から除外する。コミット・push・Issue・PR・デプロイは行っていない。
