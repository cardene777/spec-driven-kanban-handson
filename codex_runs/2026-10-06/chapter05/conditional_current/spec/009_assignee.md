# 担当者仕様
## 参考・用語
constitution、000〜003、005、inputs/009_assignee_spec_input.md。Assignee=userIdで割り当てる利用者。
## 機能要件・受入条件
FR-001 POST /api/cards/[cardId]/assignees {userId}→201 追加。cardId/userId必須。同ユーザー409を人数上限より先に判定。ボード非member422。上限10名。
FR-002 DELETE /api/cards/[cardId]/assignees/[userId]→204 削除。
FR-003 GET /api/cards/[cardId]/assignees→200 {items:[]} 一覧、0人空配列。カード詳細に担当者表示。
FR-004（純粋関数）userIdは文字列でtrim後1文字以上だけtrue。空文字/空白のみ/非文字列false。
FR-005（純粋関数）currentCountは0以上整数かつ10未満true。9人許可/10人拒否、負数/非整数false。
## 異常系・境界条件・バリデーション
不存在card/user404、未ログイン401、権限403、非メンバー/11人目422、重複409。0人/9人/10人/11人。本文外の上限は加えない。
## 権限境界
member以上追加/削除、viewer閲覧。
## カード詳細画面
0人担当者なし、10人で追加抑止。API保存と画面接続は未実装。
## 非機能
requestIdログ、constitution設計目標、原子的に人数取得と追加。
## 実装・テスト範囲
CHAPTER05第6〜8節はFR-004/005のみ。保存/API/権限/画面は対象外で未確認。
## 未決事項
なし。純粋関数以外は未実装。
