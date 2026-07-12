# 検索と絞り込み UI 設計

## 関連仕様・設計

- `constitution.md`
- `spec/008_search_filter.md`
- `spec/006_label.md`
- `spec/007_due_date.md`
- `spec/005_card_detail.md`
- `design/008_search_filter.md`
- `design/005_card_detail_ui.md` (Atom SSOT)
- `design/006_label_ui.md` (`LabelBadge` の参照元)
- `design/007_due_date_ui.md` (`DateInput` / `CardDueDateBadge` の参照元)

## 前提

本 file は `design/008_search_filter.md` の Client Component 群 (`BoardSearchBar` / `CardSearchKeywordInput` / `CardFilterLabelsPicker` / `CardFilterDueDatePicker` / `CardFilterAssigneePicker` / `CardFilterStatusPicker` / `CardSearchClearButton` / `useCardSearch`) を Atomic Design で整理する。 共通 Atom / Molecule は Step 1-3 の SSOT を参照元とし、 本 file で重複定義しない。

## 参照する Atom (再利用)

以下 9 個は `design/005_card_detail_ui.md § Atom 一覧` を参照元とし、 本 file で新規定義しない。

| Atom | 再利用先 |
|---|---|
| `Button` | 「フィルタをクリア」 / 各 picker のトリガー |
| `IconButton` | 検索欄クリア / picker 開閉 |
| `TextInput` | キーワード入力の下地 |
| `Badge` | フィルタ chip の下地 |
| `Avatar` | 担当者 picker の 1 行 |
| `Spinner` | 検索中インジケータ |
| `ErrorText` | クエリバリデーションエラー |
| `EmptyStateMessage` | 検索結果 0 件 / フィルタ適用中の空状態 |
| `FormLabel` | picker 内のセクション見出し |

`design/007_due_date_ui.md § 新規 Atom` の `DateInput` を期間指定 (`dueDateFrom` / `dueDateTo`) で再利用する。

## 参照する Molecule (再利用)

| Molecule | 出典 | 再利用先 |
|---|---|---|
| `LabelBadge` | `design/006_label_ui.md § Molecule 一覧` | ラベル picker の 1 行 + フィルタ chip |
| `CardDueDateBadge` | `design/007_due_date_ui.md § Molecule 一覧` | 検索結果カード行の期限バッジ (既存流用) |
| `InlineErrorPanel` | `design/005_card_detail_ui.md § Molecule 一覧` | 検索 API `4xx` / `5xx` エラー |

## 新規 Atom

| Atom | 責務 | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|
| `Checkbox` | チェックボックス | `checked: boolean` / `onChange: (next: boolean) => void` / `disabled?: boolean` / `id?: string` / `label?: string` | 制御された input | `app/_components/atoms/Checkbox.tsx` |
| `Radio` | ラジオボタン (排他) | `checked: boolean` / `onChange: () => void` / `name: string` / `value: string` / `disabled?: boolean` / `label?: string` | 制御された input | `app/_components/atoms/Radio.tsx` |

## 新規 Molecule (検索・絞り込み機能)

| Molecule | 責務 | 構成 Atom | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `SearchInput` | 検索欄。 keyword + クリア + spinner | `TextInput` + `IconButton` + `Spinner` | `value: string` / `onChange: (v: string) => void` / `loading?: boolean` / `maxLength?: number` / `placeholder?: string` | 内部状態なし (制御) | `app/_components/molecules/SearchInput.tsx` |
| `FilterChip` | 適用中フィルタの chip 表示 (削除アイコン付き) | `Badge` + `IconButton` | `label: string` / `color?: BadgeColor` / `onRemove: () => void` | 内部状態なし | `app/_components/molecules/FilterChip.tsx` |
| `CheckboxGroup` | チェックボックスのグループ | `FormLabel` + `Checkbox` × N | `legend: string` / `options: { value: string, label: string }[]` / `values: string[]` / `onChange: (values: string[]) => void` | 内部状態なし | `app/_components/molecules/CheckboxGroup.tsx` |
| `RadioGroup` | ラジオのグループ (排他) | `FormLabel` + `Radio` × N | `legend: string` / `name: string` / `options: { value: string, label: string }[]` / `value: string \| null` / `onChange: (v: string \| null) => void` / `allowClear?: boolean` | 内部状態なし | `app/_components/molecules/RadioGroup.tsx` |
| `DateRangeInput` | 期間指定 (from / to) | `FormLabel` + `DateInput` × 2 + `ErrorText` | `from: string \| null` / `to: string \| null` / `onChange: (next: { from: string \| null, to: string \| null }) => void` / `error?: string` | 内部状態なし (制御) | `app/_components/molecules/DateRangeInput.tsx` |
| `FilterPopover` | picker 用の開閉パネル (トリガー + panel) | `Button` + slot | `label: string` / `active: boolean` / `open: boolean` / `onOpenChange: (next: boolean) => void` / `children` | `open` は親が制御 | `app/_components/molecules/FilterPopover.tsx` |
| `LabelSelectRow` | ラベル picker 内の 1 行 | `Checkbox` + `LabelBadge` | `label: Label` / `selected: boolean` / `onToggle: (labelId: string, next: boolean) => void` | 内部状態なし | `app/_components/molecules/LabelSelectRow.tsx` |
| `AssigneeSelectRow` | 担当者 picker 内の 1 行 | `Checkbox` + `Avatar` + name | `user: { id: string, name: string }` / `selected: boolean` / `onToggle: (userId: string, next: boolean) => void` | 内部状態なし | `app/_components/molecules/AssigneeSelectRow.tsx` |

## Organism 一覧 (検索・絞り込み機能)

| Organism | 責務 | 構成 Molecule / Atom | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `CardSearchKeywordInput` | キーワード入力 + 300ms デバウンス | `SearchInput` + `ErrorText` | `value: string` / `onChange: (v: string) => void` / `loading?: boolean` / `error?: string` | デバウンス用の一時値 (Organism 内) | `app/_components/organisms/search-filter/CardSearchKeywordInput.tsx` |
| `CardFilterLabelsPicker` | ラベル絞り込み。 multi-select + 「ラベルなし」 排他チェック | `FilterPopover` + `LabelSelectRow` × N + `Checkbox` (「ラベルなし」) + `EmptyStateMessage` | `boardLabels: Label[]` / `value: { labelIds: string[], labelsNone: boolean }` / `onChange: (v) => void` | popover の `open` を Organism 内で保持 | `app/_components/organisms/search-filter/CardFilterLabelsPicker.tsx` |
| `CardFilterDueDatePicker` | 期限絞り込み。 排他選択 (none / overdue / today / within7Days / range) | `FilterPopover` + `RadioGroup` + `DateRangeInput` | `value: DueDateFilter` / `onChange: (v: DueDateFilter) => void` | popover の `open` + range 入力中値を Organism 内で保持 | `app/_components/organisms/search-filter/CardFilterDueDatePicker.tsx` |
| `CardFilterAssigneePicker` | 担当者絞り込み。 排他選択 (me / IDs / none) | `FilterPopover` + `RadioGroup` + `AssigneeSelectRow` × N | `boardMembers: User[]` / `currentUserId: string` / `value: AssigneeFilter` / `onChange: (v: AssigneeFilter) => void` | popover の `open` を Organism 内で保持 | `app/_components/organisms/search-filter/CardFilterAssigneePicker.tsx` |
| `CardFilterStatusPicker` | ステータス切替 (`active` / `archived` / `deleted`) | `RadioGroup` | `value: "active" \| "archived" \| "deleted"` / `onChange: (v) => void` | 内部状態なし | `app/_components/organisms/search-filter/CardFilterStatusPicker.tsx` |
| `AppliedFiltersRow` | 適用中フィルタ chip 一覧 + 全解除ボタン | `FilterChip` × N + `Button` | `state: CardSearchState` / `onRemove: (key: string) => void` / `onClearAll: () => void` | 内部状態なし | `app/_components/organisms/search-filter/AppliedFiltersRow.tsx` |
| `BoardSearchBar` | 検索バー + 4 picker + status + AppliedFiltersRow の親。 `useCardSearch` を呼び URL 同期と API 呼出を集約 | 上記 5 picker + `CardSearchKeywordInput` + `AppliedFiltersRow` + `InlineErrorPanel` | `boardId: string` / `boardLabels: Label[]` / `boardMembers: User[]` / `currentUserId: string` / `onResultChange: (visibleCardIds: Set<string> \| null) => void` | `useCardSearch` から得る `state` / `loading` / `error` を集約 (下位 picker に流す) | `app/_components/organisms/search-filter/BoardSearchBar.tsx` |

`DueDateFilter` と `AssigneeFilter` の型は `useCardSearch` hook file に SSOT を置き、 他 file から import する。

## 検索状態 hook

| 種別 | 名称 | 責務 | 配置パス |
|---|---|---|---|
| 型 | `CardSearchState` | `{ q: string, labelIds: string[], labelsNone: boolean, dueDate: DueDateFilter, assignee: AssigneeFilter, status: "active" \| "archived" \| "deleted" }` | `app/_components/organisms/search-filter/useCardSearch.ts` |
| Hook | `useCardSearch` | URL クエリ ↔ state 同期 (`useSearchParams` + `router.replace`)、 300ms デバウンス、 `GET /api/boards/{boardId}/cards/search` 呼出、 結果 `Set<string>` を返す | 同上 |

`useCardSearch` は Organism 内でのみ使用し、 file 外に export しない。

## Template

| Template | 責務 | 構成 Organism | props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `BoardDetailTemplate` | ボード詳細画面の 3 段レイアウト (ヘッダー + `BoardSearchBar` + `BoardListsView`) | `BoardHeader` (既存) + `BoardSearchBar` + `BoardListsView` (既存 `design/002_lists.md`) | `board: Board` / `boardLabels: Label[]` / `boardMembers: User[]` / `currentUserId: string` / `initialLists: List[]` / `initialCards: Card[]` | 検索結果 `visibleCardIds` を Client 部で保持 (Template 自体は Server Component、 検索連動部分は子 Client Component が担当) | `app/_components/templates/BoardDetailTemplate.tsx` |

`BoardListsView` に検索結果を反映するため、 内部の Client 部 (`BoardDetailClientShell`) が `BoardSearchBar` の `onResultChange` を受け取り、 `visibleCardIds` を props で `BoardListsView` に伝える。

| 補助 Organism | 責務 | 配置パス |
|---|---|---|
| `BoardDetailClientShell` | `BoardSearchBar` の結果状態 (`visibleCardIds: Set<string> \| null`) を保持し、 `BoardListsView` に流す | `app/_components/organisms/board/BoardDetailClientShell.tsx` |

## Page

| Page | 責務 | 使う Template | 状態 | 配置パス |
|---|---|---|---|---|
| `BoardPage` (既存 `design/005_card_detail_ui.md § Page` から拡張) | ボード配下の `Board` / `List[]` / `Card[]` / `Label[]` / `User[]` を prisma で取得し、 `BoardDetailTemplate` に渡す。 URL クエリ (`?q=...&labelIds=...&status=archived&card={cardId}`) を Server Component 側で読み、 初期 state を hydration | `BoardDetailTemplate` + `CardDetailModalTemplate` (URL クエリ `card` があるとき) | Server Component は URL クエリを props で受渡すのみ、 Client 側の state は `useCardSearch` が管理 | `app/boards/[boardId]/page.tsx` |

## コンポーネント関係表

| 親 | 子 | 関係 |
|---|---|---|
| `BoardPage` | `BoardDetailTemplate` | 常時 mount |
| `BoardDetailTemplate` | `BoardHeader` / `BoardDetailClientShell` | 3 段レイアウトの slot |
| `BoardDetailClientShell` | `BoardSearchBar` / `BoardListsView` | 検索結果を props で連結 |
| `BoardSearchBar` | `CardSearchKeywordInput` / `CardFilterLabelsPicker` / `CardFilterDueDatePicker` / `CardFilterAssigneePicker` / `CardFilterStatusPicker` / `AppliedFiltersRow` / `InlineErrorPanel` | 検索 state と 4 filter の集約 |
| `AppliedFiltersRow` | `FilterChip` × N / `Button` | 適用中 filter の可視化と削除 |
| `CardFilterLabelsPicker` | `FilterPopover` / `LabelSelectRow` × N / `Checkbox` (「ラベルなし」) / `EmptyStateMessage` | ラベル multi-select + 排他チェック |
| `LabelSelectRow` | `Checkbox` / `LabelBadge` | 1 ラベルの選択 |
| `CardFilterDueDatePicker` | `FilterPopover` / `RadioGroup` / `DateRangeInput` | 5 排他オプション + range |
| `DateRangeInput` | `FormLabel` / `DateInput` × 2 / `ErrorText` | from / to 入力 |
| `CardFilterAssigneePicker` | `FilterPopover` / `RadioGroup` / `AssigneeSelectRow` × N | 排他オプション + 複数選択 |
| `AssigneeSelectRow` | `Checkbox` / `Avatar` | 1 メンバーの選択 |
| `CardFilterStatusPicker` | `RadioGroup` | 3 択 |
| `CardSearchKeywordInput` | `SearchInput` / `ErrorText` | keyword + デバウンス |
| `SearchInput` | `TextInput` / `IconButton` / `Spinner` | 入力欄 + クリア + spinner |

## 状態の所在

| 状態 | どこが持つか | 共有方法 |
|---|---|---|
| 検索 state (`CardSearchState`) SSOT | URL クエリ (`?q=...&labelIds=...`) | `useCardSearch` hook が `useSearchParams` から復元し、 `router.replace` で書戻す |
| Client 側の即時 state (デバウンス前) | `useCardSearch` hook の内部 `useState` | Organism (`CardSearchKeywordInput` / 各 picker) には props 経由で流し、 変更は callback で hook に戻す |
| 検索 API 結果 (`Set<string>` = カード ID 集合) | `useCardSearch` hook 内 | `BoardSearchBar` の `onResultChange` 経由で `BoardDetailClientShell` → `BoardListsView` |
| 検索 loading / error | `useCardSearch` hook 内 | 各 Organism に props で流す (`SearchInput.loading` / `InlineErrorPanel.message`) |
| ボード配下の全ラベル (`boardLabels`) | `BoardPage` の Server Component (prisma 取得) | props で `BoardDetailTemplate` → `BoardSearchBar` → `CardFilterLabelsPicker` |
| ボード配下の全メンバー (`boardMembers`) | `BoardPage` の Server Component (prisma 取得) | props で `BoardDetailTemplate` → `BoardSearchBar` → `CardFilterAssigneePicker` |
| 現在ユーザー ID (`currentUserId`) | `BoardPage` の Server Component (認証共通ユーティリティ) | props で下位に伝搬 |
| picker popover の開閉 | 各 picker Organism (`useState`) | 領域外に漏らさない |
| ラベル filter の「ラベルなし」 と `labelIds` の排他 | `useCardSearch` の setter で正規化 (`labelsNone = true` にすると `labelIds` を空に上書き) | Organism 側は state をそのまま props に反映 |

## URL クエリ同期の詳細

`useCardSearch` は以下の変換規則で URL クエリと `CardSearchState` を双方向同期する。

| クエリキー | state field | 変換規則 |
|---|---|---|
| `q` | `q` | 空文字 / 未指定は state 側 `""` |
| `labelIds` | `labelIds` | カンマ区切り、 未指定は `[]` |
| `labelsNone` | `labelsNone` | `"true"` のみ真、 それ以外 / 未指定は false |
| `dueDateNone` / `dueDateOverdue` / `dueDateToday` / `dueDateWithin7Days` | `dueDate.mode` | 対応する mode が true、 未指定は `null` |
| `dueDateFrom` / `dueDateTo` | `dueDate.range` | `YYYY-MM-DD`、 未指定は `null` |
| `assigneeMe` / `assigneeNone` | `assignee.mode` | `"true"` のみ、 未指定は false |
| `assigneeIds` | `assignee.ids` | カンマ区切り、 未指定は `[]` |
| `status` | `status` | 列挙値、 未指定は `"active"` |

キーワード入力は 300ms デバウンス後に URL 更新 + API 呼出、 それ以外の filter 変更は即時 URL 更新 + API 呼出とする (`design/008_search_filter.md § UI 状態遷移`)。

## アクセシビリティ要件

| 要件 | 対応 |
|---|---|
| 検索欄のラベル | `SearchInput` の `TextInput` に `aria-label="カードを検索"` を付与 |
| picker のトリガー / popover 関連付け | `FilterPopover` の `Button` に `aria-haspopup="true"` + `aria-expanded` + `aria-controls`、 panel 側に `role="dialog"` |
| `FilterChip` の削除操作 | `IconButton` の `label` に「{filter 名} を解除」 |
| `RadioGroup` / `CheckboxGroup` の見出し | `FormLabel` を `<legend>` として `<fieldset>` にまとめる |
| 検索結果 0 件 | `EmptyStateMessage` に `role="status"` + `aria-live="polite"`、 通常の空状態と文言を分ける (`ui-design/`) |
| loading の可視化 | `SearchInput.loading` が true のとき `Spinner` の `label` を `"検索中"` に固定 |
| キーボード操作 | `FilterPopover` は Esc で閉じる、 内部の `RadioGroup` / `CheckboxGroup` は矢印キー / Tab で操作可能 |
| ラベル chip の色のみに依存しない | `FilterChip` は `Badge` の色 + text を併用 |

## 実装方針

- `useCardSearch` は URL SSOT 方針を採用する。 state 変更は必ず URL 経由 (`router.replace`) で戻し、 直リンクとブラウザバックで検索結果を復元可能にする (`design/008_search_filter.md § URL 同期`)。
- ラベル filter で `labelsNone = true` を選択したら `labelIds` を空にリセットする (排他)、 逆に `labelIds` に 1 件以上追加したら `labelsNone = false` にする。 排他ルールは Organism 側の setter で強制し、 API に到達する前に正規化する (`spec/008_search_filter.md § 異常系` の `invalid_labels_options` を UI 側で防ぐ)。
- 期限 filter の 5 排他オプションは 1 個の `RadioGroup` で選択させ、 `range` 選択時のみ `DateRangeInput` を表示する。 mode 切替時に `range` の値は破棄する。
- 担当者 filter の 3 排他オプション (me / IDs / none) は `RadioGroup` の 3 択、 `IDs` 選択時のみ `AssigneeSelectRow` の複数選択が有効になる。
- 検索 API `422` は `AppliedFiltersRow` 直下に `InlineErrorPanel` で表示し、 該当 filter の chip を強調する。 直前の結果は破棄せず保持する (`design/008_search_filter.md § ローディングとエラー`)。
- 検索結果 `Set<string>` が `null` のとき (= 検索未実行) は全カード表示、 空 Set のとき (= 結果 0 件) は全リストが空状態表示になる。 リスト内の空状態文言を「フィルタ適用中の該当なし」 に切替える。
- カード行 (`CardRow`) 上の期限バッジ / ラベルバッジ表示は既存 (`design/006_label_ui.md` / `design/007_due_date_ui.md`) の Molecule を使い、 検索用に新規追加しない。
- 全 Client Component は `"use client"` を宣言、 Template と Page は Server Component で prisma 取得を担う。

## ファイル一覧

本 skill 実行で作成した file。

| 順 | file | 状態 |
|---|---|---|
| Step 1 | `design/005_card_detail_ui.md` | 新規作成 |
| Step 2 | `design/006_label_ui.md` | 新規作成 |
| Step 3 | `design/007_due_date_ui.md` | 新規作成 |
| Step 4 | `design/008_search_filter_ui.md` | 新規作成 (本 file) |

spec 配下および既存 design/ 配下の file は書き換えていない。
