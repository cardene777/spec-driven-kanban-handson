# 担当者割り当てレビューレポート

レビュー日時: 2026-07-16
対象実装:
- API = `app/api/cards/[cardId]/assignees/route.ts` / `app/api/cards/[cardId]/assignees/[userId]/route.ts`
- lib = `lib/schemas/assignees.ts` / `lib/assignees/limit.ts` / `lib/assignees/permission.ts`
- UI = `components/cards/CardAssigneesField.tsx` / `components/cards/CardAssigneeAddForm.tsx` / `components/cards/CardAssigneeBadge.tsx` / `components/cards/CardDetailModal.tsx`
- ページ配線 = `app/boards/[boardId]/page.tsx`
- 併せて突合 = ラベル(006) / 期限(007) / 検索(008) の実装、デザインシステム (`brand.json` / `app/tokens.css` / `app/globals.css` / `components/layout/AppShell.tsx` / `components/ui/*`)

対象仕様: `spec/009_assignee.md` (併せて `spec/006_label.md` / `spec/007_due_date.md` / `spec/008_search_filter.md`)
対象設計: `design/009_assignee.md` (同上)

## サマリー

| 観点 | Critical | Important | Polish |
|---|---|---|---|
| 観点1 仕様カバレッジ | 0 | 1 | 0 |
| 観点2 実装カバレッジ | 0 | 0 | 1 |
| 観点3 振る舞いの整合 | 0 | 1 | 0 |
| 観点4 権限境界の整合 | 0 | 0 | 0 |
| 観点5 用語の整合 | 0 | 0 | 0 |
| 観点6 デザイントークン一貫 | 0 | 0 | 0 |
| 観点7 コンポーネント使用一貫 | 0 | 1 | 1 |
| 観点8 共通レイアウト適用一貫 | 0 | 0 | 1 |
| 合計 | 0 | 3 | 3 |

## 判定

- Critical は 0 件。担当者・ラベル・期限・検索の主要フローは仕様どおり動作し、テストも緑と報告されている。ただしテストが緑でも仕様との一致は別問題であり、下記 Important 2 件はテストが緑のまま見逃されている。
- 観点6 (デザイントークン一貫) は 0 件だが、これは「観点が対象に届いていない signal」 ではない。`app/**` / `components/**` に生 hex と生 Tailwind 色クラスが 1 件も無いことを grep で実証済みで、色コードが `brand.json` / `app/tokens.css` に集約された状態を確認できた。他観点で不一致が出ているため、観点設計は対象に届いている。
- 深刻度は Critical から順に対応する。本レポートの Important 3 件はいずれも「動作するが一貫性 / 監査要件が崩れている」 分類。

## Important

### I-1: 担当者操作の監査ログに `actorId` / `boardId` / `userId` / `count` が残らない

- 観点 = 観点1 仕様カバレッジ
- 対象ファイル = `app/api/cards/[cardId]/assignees/route.ts` (GET / POST) / `app/api/cards/[cardId]/assignees/[userId]/route.ts` (DELETE)
- 問題の理由
  - `spec/009_assignee.md § 非機能要件 § 運用` は「担当者追加・削除の各操作について、操作種別・対象識別子 (`cardId`)・担当対象 (`userId`)・対象ボード識別子 (`boardId`)・操作ユーザー識別子・タイムスタンプを操作ログに残す」 と要求する。
  - `design/009_assignee.md § 監査ログ` は成功時に `card.assignee.list` = `context={ boardId, count }`、`card.assignee.add` = `context={ boardId, userId }`、`card.assignee.remove` = `context={ boardId, userId }` を残せと明示している。
  - 実装は `withApiHandler` の options を Route Handler 先頭で固定しており、GET / POST の context は `{ cardId }` のみ、DELETE は `{ cardId, userId }` のみ。POST に `userId` (誰を割り当てたか) が無く、全操作で `boardId` と `count` が欠落する。
  - `withApiHandler` の `options.actorId` にも `user.id` を渡していないため、`lib/log/audit.ts` の `logAudit` は全操作で `actorId=null` を記録する (`design/001_boards.md § 監査ログの共通形式` の「操作ユーザー ID」 に不一致)。
  - これはラベル(006) / 期限(007) / 検索(008) の Route Handler でも同一パターン (`context: { cardId }` 固定 + `actorId` 未指定) で、既存の `review/010_comment_review.md 不一致 1` と同根の横断課題。
- 修正案
  - POST では `user.id` (actorId) と `card.boardId` を先に確定できるため、成功時に限り `context={ boardId, userId }` を差し戻せるよう `withApiHandler` の signature を「fn 内から context を追記できる形」 に見直すか、Route Handler 内で `logAudit` を明示的に呼ぶ経路へ切り替える。
  - `actorId: user.id` は全 3 endpoint で options に追加できる (`requireCurrentUser` の後に固定値として渡せる)。
- 確認が必要な判断点
  - 監査要件を満たすために `withApiHandler` を横断改修するか、担当者機能だけ先行して個別対応するか。前者は全 API に影響するため別 PR に切り出す判断が要る。

### I-2: 担当者 10 名到達カードへ「既割当ユーザー」 を再 POST すると 409 でなく 422 が返る

- 観点 = 観点3 振る舞いの整合
- 対象ファイル = `app/api/cards/[cardId]/assignees/route.ts` (POST)
- 問題の理由
  - `spec/009_assignee.md § 境界条件 § 追加時の重複判定` は「既に担当者として設定済みの `userId` を `POST`: `409` (`already_assigned`) を返し、一覧の件数と順序は変わらない」 と規定する。担当者数の状態に条件を付けていない。
  - `design/009_assignee.md § 実装方針` は「事前 count はあくまで 10 名上限判定用のみに使う (競合状態でも `409` に集約される)」「重複判定は create 直後の `P2002` 捕捉を主とする」 と設計意図を書いている。
  - 実装は POST トランザクション内で `count = cardAssignee.count()` → `assertBelowLimit(count)` を `create` より前に実行する。担当者がちょうど 10 名のカードに、その 10 名のうちの 1 名を再度 `POST` すると、`count=10` の時点で `assertBelowLimit` が `422 assignees_limit_exceeded` を throw し、重複を検出する `P2002` 捕捉 (`409 already_assigned`) に到達しない。
  - 結果、「満員カードでの重複追加」 という 1 ケースで、spec が期待する `409` の代わりに `422` が返る。10 名未満のカードでは `create` まで到達し `409` が正しく返るため、境界 (ちょうど 10 名) でのみ顕在化する。
- 修正案
  - 修正案 A (実装調整) = `create` 前に「対象 `userId` が既に割当済みか」 を確認し、割当済みなら上限判定より先に `409 already_assigned` を返す。または上限判定を「既割当でない場合のみ」 に限定する。
  - 修正案 B (spec 追記) = spec § 境界条件に「満員カードへの既割当ユーザー再 POST は上限超過 (`422`) を優先する」 と判定順を明記し、現実装を正とする。
- 確認が必要な判断点
  - 満員カードでの重複追加時に、利用者にとって `409` (既に担当者) と `422` (上限) のどちらが意味のあるメッセージか。UI (`CardAssigneeAddForm`) は割当済みユーザーを候補から除外するため通常操作では発生しないが、同時操作や API 直叩きで露出する。

### I-3: 期限「今日」 バッジだけ inline style、他の状態バッジは shadcn variant で色を当てている

- 観点 = 観点7 コンポーネント使用一貫
- 対象ファイル = `components/cards/CardDueDateBadge.tsx` / `components/ui/badge.tsx`
- 問題の理由
  - `components/ui/badge.tsx` の variant は `default` / `secondary` / `destructive` の 3 種のみで、`warning` / `success` の variant を持たない。
  - `CardDueDateBadge` は overdue を `<Badge variant="destructive">`、future を `<Badge variant="secondary">` で表現する一方、today だけ variant が無いため `style={{ backgroundColor: "var(--warning)", color: "var(--brand-neutral-0)" }}` の inline style で色を当てている。
  - 同じ「状態を色で示すバッジ」 という役割に対して、片方は variant、片方は inline style と 2 系統の実装が混在している。色そのものはトークン (`var(--warning)`) 参照なので観点6 (トークン一貫) には抵触しないが、コンポーネント使用の一貫性が崩れている。
  - 加えて today の文字色 `var(--brand-neutral-0)` は `app/tokens.css` のダークモードブロックで暗色 (`#1b1a17`) に反転する一方、`--warning` (`#d08b2c`) は反転しないため、ダーク時は「暗いオレンジ地に暗い文字」 に近づく。variant 化すれば `*-foreground` トークンで明暗を一括制御できる。
- 修正案
  - `badge.tsx` に `warning` (および必要なら `success`) variant を追加し、`bg-warning text-warning-foreground` 相当のトークンクラスで色を当てる。`CardDueDateBadge` の today を `<Badge variant="warning">` に置き換え、inline style を撤去する。
  - `--warning-foreground` に相当する semantic token を `app/globals.css` に定義し、明暗両対応にする。
- 確認が必要な判断点
  - デザインシステム側で status 系 variant (`warning` / `success`) を正式に増やすか、今回は今日バッジのみ最小修正に留めるか。ラベル 8 色は既に inline style + token で確立しているため、status バッジも inline を許容する方針なら現状維持も選択肢。

## Polish

- P-1 (観点7 コンポーネント使用一貫): `components/members/InviteCreateForm.tsx` / `components/members/BoardMemberList.tsx` がロール選択に native `<select>` を使う。両ファイルとも「置換対象 15 component に `<select>` は含まれないため native のまま token 由来 class で見た目だけ統一する」 とコメントで明示済みで、`selectClass` に `border-input` / `focus-visible:ring-ring` 等トークン由来クラスを当てている。意図された例外だが、他フォーム要素が shadcn (`Input` / `Textarea` / `Button`) に統一されている中で唯一の native 要素であり、shadcn `Select` 導入時の置換候補として記録しておく確認点。
- P-2 (観点8 共通レイアウト適用一貫): 認証系 3 画面 (`app/login/page.tsx` / `app/signup/page.tsx` / `app/invites/[token]/page.tsx`) はいずれも AppShell で包まず `<main className="flex min-h-full flex-1 items-center justify-center bg-muted/40 px-4 py-12">` の中央寄せで統一されている (「包まないと決めた画面」 のルールは一貫)。ただし login / signup は中身を `<Card>` で包むのに対し、invites だけ素の `<div className="w-full max-w-lg">` を使い、認証系の中でカード枠の有無がずれている。invites も `<Card>` に揃えると非 AppShell 画面の統一が完成する。
- P-3 (観点2 実装カバレッジ): `components/cards/CardAssigneesField.tsx` が初期表示 (useEffect 内 inline fetch) と再取得 (`load` callback) で同じ GET 呼び出しロジックを二重に持ち、`load` は `loading` を制御しない (再取得中にスピナーが出ない)。動作は正しいが、fetch ロジックを `load` に一本化して useEffect から呼ぶ形にすると重複が消える。仕様・設計には抵触しないコード整理。

## デザインシステム観点 (6〜8) の機能検証

更新版 SKILL.md で追加された観点6〜8 と深刻度分類が実際に機能したかの確認結果。

- 観点6 デザイントークン一貫 = 0 件。`grep -rnE '#[0-9a-fA-F]{3,6}' app components` と生 Tailwind 色クラス (`bg-red-500` 等) の grep がいずれも `app/**` / `components/**` で 0 ヒット。色は `brand.json` → `app/tokens.css` → `app/globals.css` の semantic token 経由でのみ参照され、ラベル 8 色・期限バッジも `var(--label-*)` / `var(--warning)` のデータ参照に統一されていた。design-system skill (修正版) がトークン集約を達成した実証で、0 件は「達成状態」 側と判断する (他観点で不一致が出ているため観点未到達 signal ではない)。
- 観点7 コンポーネント使用一貫 = 2 件検出 (I-3 / P-1)。5 観点固定の旧版では拾えなかった。「同じ役割 (状態バッジ / フォーム選択) に別実装が混在」 という不一致は、仕様・設計との突合 (観点1〜3) には現れず、コンポーネント使用の横断視点で初めて顕在化した。特に I-3 (今日バッジの inline style) は API・振る舞い・権限のどの基本観点でも検出できない純粋な実装一貫性の問題。
- 観点8 共通レイアウト適用一貫 = 1 件検出 (P-2)。AppShell が主要 3 画面 (`app/page.tsx` / `app/boards/[boardId]/page.tsx` / `app/boards/[boardId]/members/page.tsx`) を包み、認証系 3 画面が非 AppShell で統一されていることを確認した上で、invites だけカード枠が欠ける差を拾えた。これも基本 5 観点の範囲外。

結論として、デザイン観点 6〜8 で計 3 件 (Important 1 / Polish 2) を検出し、うち 3 件すべてが基本 5 観点だけでは拾えなかった実装一貫性・レイアウト一貫性の不一致だった。深刻度分類も機能し、「トークン集約は達成 (観点6=0)、しかしコンポーネント / レイアウトの一貫性に隙間 (観点7/8)」 という粒度で状態を切り分けられた。

## 前回 (5 観点固定・深刻度なし版) と比べた改善点

- 観点の網羅性 = 前回は基本 5 観点のみで、デザインシステム由来の不一致 (I-3 / P-1 / P-2) を検出する枠が無かった。今回は観点6〜8 が加わり、API・振る舞いに現れない実装一貫性の 3 件を明示的に拾えた。
- 優先度付け = 前回は「不一致 1〜5」 を並列に列挙し、対応順の指針が無かった。今回は Critical / Important / Polish の 3 段階で、まず対応すべき Important 3 件 (監査ログ・境界の 409/422・状態バッジ実装) と、後回し可能な Polish 3 件を分離できた。
- 0 件観点の解釈 = 前回フォーマットには「全観点0件は観点設計を疑う signal」 の指針が無かった。今回は観点6=0 件を「grep 実証に基づく達成状態」 と根拠付きで判定し、他観点の検出有無と合わせて「観点未到達ではない」 と結論できた。

## 実行した確認コマンド

- `grep -rnE '#[0-9a-fA-F]{3,6}' app components --include='*.tsx' --include='*.ts'` (tokens.css 除外) = 0 ヒット (生 hex なし)
- `grep -rnE '<(button|input|textarea|table|select)[ >]' app components` = native `<select>` 参照 2 件のみ (コメント行と実使用、P-1)、その他 native フォーム要素なし
- `grep -rnE '(bg|text|border|ring)-(red|blue|green|...)-[0-9]' app components` = 0 ヒット (生 Tailwind 色クラスなし)
- `grep -rln 'AppShell' app` = `app/page.tsx` / `app/boards/[boardId]/page.tsx` / `app/boards/[boardId]/members/page.tsx` の 3 画面
- 監査 context 確認 = 担当者 / ラベル / 期限 / 検索の全 Route Handler が `context: { cardId ... }` 固定 + `actorId` 未指定を確認 (I-1)

## 未実行の確認 (本レビュー対象外)

- Route Handler 統合テスト = SQLite テスト DB helper 未整備のため `design/009_assignee.md § テスト方針` の判断に従いスコープ外 (I-2 の 409/422 境界は Route Handler テストで固定するのが望ましい)
- E2E / ブラウザ目視 (ダークモードでの今日バッジ視認性、I-3) = 本レビュー対象外
- `npm test` / `npx tsc --noEmit` の再実行 = 実装は書き換えていないため未実行 (284 tests pass の前提を継承)

## 作成または更新したファイル

- `review/009_full_review.md` (新規作成のみ。仕様・設計・実装・テストは一切書き換えていない)
