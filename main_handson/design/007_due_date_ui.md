# 期限 UI 設計

## 関連仕様・設計

- `constitution.md`
- `spec/007_due_date.md`
- `spec/005_card_detail.md`
- `design/007_due_date.md`
- `design/005_card_detail_ui.md` (Atom SSOT + カード詳細構造の親)

## 前提

本 file は `design/007_due_date.md` の Client Component (`CardDueDateField` / `CardDueDateBadge` / `useDueDateStatus`) を Atomic Design で整理する。 共通 Atom は `design/005_card_detail_ui.md § Atom 一覧` を参照元とし、 本 file では重複定義しない。

`design/005_card_detail_ui.md § Organism 一覧` の `CardDueDateField` はプレースホルダで、 本 file が実定義を担う。 `Badge` Atom の `color` prop は 8 色のうち期限状態表現に `blue` / `orange` / `red` の 3 色を用いる。

## 参照する Atom (再利用)

以下 7 個は `design/005_card_detail_ui.md § Atom 一覧` を参照元とし、 本 file で新規定義しない。

| Atom | 再利用先 |
|---|---|
| `Button` | 「期限を設定する」 / 「期限を解除する」 / 「保存」 / 「キャンセル」 |
| `IconButton` | 期限領域のクイック解除 |
| `Badge` | `CardDueDateBadge` の下地 |
| `ErrorText` | 期限バリデーションエラー |
| `EmptyStateMessage` | 期限未設定時の文言 |
| `Spinner` | 楽観的更新中 |
| `Timestamp` | 期限日の可読表示 (書式 `date`) |

## 新規 Atom

| Atom | 責務 | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|
| `DateInput` | `<input type="date">` の薄いラッパ | `value: string \| null` (`YYYY-MM-DD` または `null`) / `onChange: (v: string \| null) => void` / `disabled?: boolean` / `invalid?: boolean` / `min?: string` / `max?: string` | 制御された input | `app/_components/atoms/DateInput.tsx` |

`value: null` を受けたときは `input` の `value` を空文字にする。 `onChange` は空文字入力を `null` に正規化して親に伝える。 `YYYY-MM-DD` 以外の入力はブラウザの type=date が阻止するため、 バリデーションは Organism 側で行う。

## 共通型と hook

`design/007_due_date.md § 期限切れ判定ロジック` の `computeDueDateStatus` / `getServerTodayUtc` は `lib/dueDate/status.ts` を SSOT とし、 UI 側はそれを import する。 本 file では以下を新設する。

| 種別 | 名称 | 責務 | 配置パス |
|---|---|---|---|
| 型 | `DueDateStatus` | `"none" \| "future" \| "today" \| "overdue"` の 4 値 (`lib/dueDate/status.ts` SSOT から再 export) | 同上 |
| Hook | `useDueDateStatus` | `dueDate: string \| null` を受け、 現在時刻依存で `DueDateStatus` を返す。 `useEffect` + `setInterval(60000)` で 1 分毎再計算する | `app/_components/organisms/due-date/useDueDateStatus.ts` |

## Molecule 一覧 (期限機能)

| Molecule | 責務 | 構成 Atom | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `DueDateStatusText` | 状態別文言 (「今日が期限」 / 「期限切れ」 / 未来日の日付) | 生 text + `Timestamp` | `dueDate: string \| null` / `status: DueDateStatus` | 内部状態なし | `app/_components/molecules/DueDateStatusText.tsx` |
| `CardDueDateBadge` | カード行の期限バッジ。 状態別に `Badge` の色を切替、 `none` は非表示 | `Badge` + `Timestamp` | `dueDate: string \| null` / `size?: "sm" \| "md"` | `useDueDateStatus(dueDate)` で status を算出 | `app/_components/molecules/CardDueDateBadge.tsx` |
| `DueDateEditor` | date picker + 解除ボタン + 保存 / キャンセル | `DateInput` + `Button` × 3 + `ErrorText` | `initialValue: string \| null` / `disabled?: boolean` / `error?: string` / `onSubmit: (next: string \| null) => Promise<void>` / `onCancel: () => void` | 編集中の `value` を Molecule 内で保持 | `app/_components/molecules/DueDateEditor.tsx` |

`CardDueDateBadge` は API 呼出を持たず状態算出のみのため Molecule に置く。 `Badge` の色マッピングは以下に固定する。

| `DueDateStatus` | Badge color | 表示要否 |
|---|---|---|
| `none` | — | 非表示 |
| `future` | `blue` | 表示 (通常表現) |
| `today` | `orange` | 表示 (注意表現) |
| `overdue` | `red` | 表示 (警告表現) |

## Organism 一覧 (期限機能)

| Organism | 責務 | 構成 Molecule / Atom | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `CardDueDateField` | カード詳細モーダルの期限領域 (`design/005_card_detail_ui.md` から委譲された実定義)。 状態別表示 + `DueDateEditor` の開閉 + 楽観的更新 + `PATCH /api/cards/{cardId}/due-date` | `CardDueDateBadge` + `DueDateStatusText` + `Button` + `DueDateEditor` + `InlineErrorPanel` + `Spinner` | `card: Card` / `onUpdated: (card: Card) => void` | `viewMode \| editing \| submitting \| error` を Organism 内で保持、 楽観的更新中は `card.dueDate` を上書きした値を保持し、 API 応答で確定 / rollback | `app/_components/organisms/due-date/CardDueDateField.tsx` |

`status = archived` / `deleted` のカードでは編集導線 (`Button`) を disable にし、 `Badge` は非表示にする (`spec/007_due_date.md § アーカイブ済み / 削除済みカードの扱い`)。 disable 判定は `card.status !== "active"`。

## Template

期限機能は独立 Template を持たない。 `design/005_card_detail_ui.md § Template` の `CardDetailModalTemplate.slots.dueDate` に `CardDueDateField` を流し込む。

## Page

期限機能は独立 Page を持たない。 `BoardPage` (`design/005_card_detail_ui.md § Page`) に統合する。 追加の Server Component 処理は不要 (`dueDate` は既存 Card レスポンスに含まれる、 `design/007_due_date.md § 既存 Card API との連携`)。

## コンポーネント関係表

| 親 | 子 | 関係 |
|---|---|---|
| `CardDetailModalTemplate` | `CardDueDateField` | `slots.dueDate` として受渡し |
| `CardDueDateField` | `CardDueDateBadge` / `DueDateStatusText` / `Button` / `DueDateEditor` / `InlineErrorPanel` / `Spinner` | 表示と編集の切替 |
| `DueDateEditor` | `DateInput` / `Button` × 3 / `ErrorText` | date picker + 解除 + 保存 + キャンセル |
| `CardDueDateBadge` | `Badge` / `Timestamp` | 状態別色 + 日付表示 |
| `CardRow` (既存 `design/003_cards.md`) | `CardDueDateBadge` | カード行にバッジを差込 |

## 状態の所在

| 状態 | どこが持つか | 共有方法 |
|---|---|---|
| カードの `dueDate` 初期値 | `BoardPage` の Server Component (prisma 取得済 Card レスポンス) | props で `CardDetailModalTemplate` → `CardDueDateField` |
| 「本日」 の `YYYY-MM-DD` 文字列 | `useDueDateStatus` hook (Client Component 内) | hook 呼出元 (`CardDueDateBadge` / `CardDueDateField`) が個別に持つ |
| 編集モードの開閉 | `CardDueDateField` (Organism 内) | 領域外に漏らさない |
| 編集中の `value` (`DateInput` の入力値) | `DueDateEditor` (Molecule 内) | 親 `CardDueDateField` には `onSubmit` 経由で確定値のみ伝える |
| 楽観的更新中の暫定 `dueDate` | `CardDueDateField` (Organism 内) | Organism 内で card 表示を上書き、 API 応答で確定 / rollback |
| 楽観的更新失敗時の rollback 値 | `CardDueDateField` の内部 (直前 `dueDate` のスナップショット) | Organism 内に閉じる |
| バリデーションエラー (`invalid_format` / `invalid_date` / `invalid_state`) | `CardDueDateField` (Organism 内) | `DueDateEditor` の `error` prop に伝搬 |

## アクセシビリティ要件

| 要件 | 対応 |
|---|---|
| `DateInput` のラベル関連付け | 親 (`DueDateEditor`) が `FormLabel` を配置し `htmlFor` で紐付ける |
| 状態バッジのスクリーンリーダー読上げ | `CardDueDateBadge` の `Badge` に `aria-label="{status 文言}: {dueDate}"` を付ける (例 `期限切れ: 2026-07-10`) |
| 色のみで状態を区別しない | `CardDueDateBadge` は Badge の色 + `DueDateStatusText` の文言 + アイコン (`ui-design/`) を併用 |
| 編集不可状態の伝達 | `card.status !== "active"` 時、 `Button` の `disabled` + `title` 属性で「アーカイブされたカードの期限は編集できません」 相当を伝える |
| キーボード操作 | `DateInput` は type=date のブラウザ標準操作、 `Button` は Tab で到達可能 |
| 1 分毎の状態再描画 | `role="status"` を付けず、 静かな更新 (announcer は使わない) |

## 実装方針

- `useDueDateStatus` hook は `setInterval(60000)` で 1 分毎に `today` を再計算する。 unmount 時に `clearInterval` する。 UTC 日付をサーバーと揃える (`design/007_due_date.md § 期限切れ判定ロジック`)。
- 楽観的更新は `CardDueDateField` のみ採用する。 rollback 対象は「編集前の `card.dueDate`」 のスナップショット 1 個で足りる。
- `DateInput` の `value` は `null` を空文字にマップする。 逆に空文字入力は `null` (期限解除) に正規化する。 これにより Organism 側は常に `string \| null` で扱える。
- `Badge` の色マッピングは Organism / Molecule 側に持たせず、 `CardDueDateBadge` Molecule に集約する (`§ Molecule 一覧` の表)。 他機能から `Badge` の色を直接指定するのは避け、 意味付き Molecule を経由させる。
- 過去日付の設定は `spec/007_due_date.md § 境界条件` で許容される。 UI 側で `DateInput` の `min` は設定しない (`ui-design/` 判断)。
- `status = archived` / `deleted` のカードで編集導線を無効化する二重防御 (`design/007_due_date.md § 実装方針`) を UI 側でも徹底する。
- `CardDueDateField` 内 hook (`useDueDateUpdate(cardId)`) は Organism に閉じ、 file 外に export しない。
