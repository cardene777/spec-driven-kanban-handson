# 独立読者検証記録

## 前提
書籍HEADは580719fe7ec6852cd620ae14a66e6fb1bb561ac2、git status --shortは空（終了0）。WORKの開始時ファイルはevidence/provenance.txtだけ。既存アプリ・仕様・ログは参照していない。配布ZIP全体は取得・展開したが、初期入力としてコピー・内容参照したのは.claudeとinputsだけ。生成例のコード・文書・画像は未参照。

## Section 01 完了
適用: 01_introduction.md全文。初期実装はBoard/List/Card CRUD・順序・カード題名説明ダイアログ・操作ログ。認証・権限実装、移動、アーカイブ、ラベル、期限、検索、絞り込み、担当者、招待は初期画面の対象外。後続工程の成果を実装済みとして扱わない。
コマンド: pwd/ファイル列挙、書籍git rev-parse/status、章一覧、本文cat、curl -fL固定コミットZIP、unzip、cp .claude/inputs。各ツールコマンド終了0。ZIP sha256: c133271a901021b7b3c6307ce762cbdc1060bc9d9848b42011193d82c2498ae7。
生成/更新: .claude/**、inputs/**、evidence/input-manifest.json。11 SKILL.md存在、コピー全ファイルのZIP内原本とのバイト一致をPython assertで確認（終了0）。HTTP: ZIPダウンロード成功（curl -f終了0）。アプリ画面/APIは未確認。

## Section 02 部分完了・停止
適用: 02_enhanced_skills.md（表示出力に切り詰めがあったため、constitutionプロンプトと関連箇所を追加読取）、constitution/SKILL.md全文、spec/SKILL.md全文、inputs/001_core_kanban_spec_input.md全文、design入力全文。design/implement Skillの全文適用には未到達。
Codex読み替え: スラッシュUIを使わずローカルSKILL.mdを読んで手順を適用。constitutionの承認はユーザー指定の仮想読者ルールで実施。
案・根拠・模擬回答: evidence/constitution-proposal.md。本文プロンプトの技術・規約・非機能・ロール・用語を整理し、基本原則は本文の工程分離/不明点確認/範囲制約を整理。「この案を承認します。新しい権限や数値条件は追加しません」。生成: constitution.md。Prisma 7等の生成例からの条件は転記していない。
/specは入力整理まで。リスト/カード削除の必要権限が本文にないため、仕様の書き出し前に停止。初期実装で権限を通過扱いにする条件は、仕様上の権限境界を決める根拠にはならない。
コマンド: cat/sed/rg/nlで本文・Skill・入力読取、Pythonでconstitutionと承認記録・入力manifest生成、git status、shasum。すべて終了0。長い本文の表示切り詰めあり。実行ログはこの要約とmanifestで保存し、個人絶対パスを含む生出力は公開候補から除外。
未実行: /design、/implement、依存導入、migration、Client生成、lint/typecheck/test/build、開発サーバー、ブラウザ・アプリHTTP操作。

## Section 03〜10 未確認
停止条件により本文の順次実行を中断。後続Skills、RED/GREEN/REFACTOR、追加テスト、レビュー、documentと参照文書照合、振り返りは未実施。参照プロジェクト生成済み文書は読んでいない。
