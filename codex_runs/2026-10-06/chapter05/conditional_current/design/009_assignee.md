# 担当者設計
## 関連仕様
spec009、000〜003、005、constitution、inputs/009_assignee_design_input.md。
## API・データモデル
FR001〜003のAPI契約を使用。CardAssignee(cardId,userId)複合unique、Card/User FK。User/BoardMembershipは将来認証接続時に用意。
## 権限チェック
認証→card存在→viewer/member権限→userId検証→user存在→board member→重複409→人数上限422。
## 原子的処理・同時追加
数取得と追加をSerializable transactionへ一括。SQLite書き込み競合は3回まで再試行、尽きたら503、requestId/競合をエラーログに記録。複合uniqueで二重追加防止。
## カード詳細UIとの接続
取得一覧で担当者表示、0人メッセージ、10人なら追加抑止、成功後再取得。未実装。
## 純粋関数の契約
lib/schemas/assignees.ts: isValidAssigneeUserId(userId:unknown):boolean。typeof string && trim().length>0。
lib/assignees/limit.ts: MAX_ASSIGNEES=10、canAddAssignee(currentCount:number):boolean。0以上整数かつ10未満のみtrue、NaN/Infinityも非整数としてfalse。
## テスト方針・TDD順序
FR004の入力検証群→FR005の人数群。Redは対象モジュール未実装による収集失敗、既存モジュール読み込みを別に確認。Greenで2ファイルだけ作成、Refactorでガード統合。テスト不変。
API409/422/401/403、存在/メンバー/DB/UIは統合環境が必要で今回は検証しない。
## 実装順序
純粋関数TDD→将来User/Membership/DB transaction統合テスト→API→UI。今回2純粋関数のみ。
## ログ方針・未決事項
将来API操作と競合にrequestId。未決なし、原子的制御は本文指定。
