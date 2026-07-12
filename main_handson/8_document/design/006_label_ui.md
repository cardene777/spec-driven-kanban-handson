# ラベル UI 設計

## 関連仕様・設計

- `constitution.md`
- `spec/006_label.md`
- `spec/005_card_detail.md`
- `design/006_label.md`
- `design/005_card_detail_ui.md` (Atom SSOT + カード詳細構造の親)

## 前提

本 file は `design/006_label.md` の Client Component (`BoardLabelsPanel` / `LabelRow` / `LabelEditForm` / `LabelDeleteConfirm` / `CardLabelsField` / `CardLabelBadge`) を Atomic Design で整理する。 共通 Atom は `design/005_card_detail_ui.md § Atom 一覧` を参照元とし、 本 file では重複定義しない。

`design/005_card_detail_ui.md § Organism 一覧` の `CardLabelsField` はプレースホルダで、 本 file が実定義を担う。

## 参照する Atom (再利用)

以下 8 個は `design/005_card_detail_ui.md § Atom 一覧` を参照元とし、 本 file で新規定義しない。

| Atom | 再利用先 |
|---|---|
| `Button` | ラベル作成 / 編集保存 / 削除 |
| `IconButton` | ラベル行の削除アイコン |
| `TextInput` | `name` 入力 |
| `Badge` | `LabelBadge` の色付き矩形の下地 |
| `ErrorText` | `name` / `color` のバリデーションエラー |
| `EmptyStateMessage` | ラベル 0 件 |
| `Spinner` | 一覧 fetch 中 |
| `FormLabel` | `name` / `color` の form label |

`Badge` の `color` prop が受ける 8 色 (`gray` / `red` / `orange` / `yellow` / `green` / `blue` / `purple` / `pink`) は `spec/006_label.md § 事前定義された色パレット` と同一の列挙値を用いる。

## 新規 Atom

| Atom | 責務 | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|
| `ColorSwatch` | 8 色パレットの単色 button | `color: LabelColor` / `selected?: boolean` / `onSelect: (color: LabelColor) => void` / `label?: string` (a11y) | 内部状態なし、 `selected` は親から | `app/_components/atoms/ColorSwatch.tsx` |

`LabelColor` 型は `type LabelColor = "red" \| "orange" \| "yellow" \| "green" \| "blue" \| "purple" \| "pink" \| "gray"` として `app/_components/atoms/ColorSwatch.tsx` 内で定義し、 他 file からも import する。

## Molecule 一覧 (ラベル機能)

| Molecule | 責務 | 構成 Atom | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `LabelBadge` | ラベルの色付きバッジ (name + color) | `Badge` | `label: { name: string, color: LabelColor }` / `size?: "sm" \| "md"` | 内部状態なし | `app/_components/molecules/LabelBadge.tsx` |
| `LabelColorPicker` | 8 色パレットの単一選択 UI | `ColorSwatch` × 8 | `value: LabelColor` / `onChange: (color: LabelColor) => void` / `error?: string` | 内部状態なし | `app/_components/molecules/LabelColorPicker.tsx` |
| `LabelFormFields` | ラベル name + color 入力群 | `FormLabel` + `TextInput` + `LabelColorPicker` + `ErrorText` × 2 | `name: string` / `color: LabelColor` / `onChangeName: (v: string) => void` / `onChangeColor: (c: LabelColor) => void` / `errors: { name?: string, color?: string }` | 内部状態なし (制御 form) | `app/_components/molecules/LabelFormFields.tsx` |
| `LabelToggleRow` | カード詳細のラベル選択行 (LabelBadge + トグル) | `LabelBadge` + `IconButton` | `label: Label` / `attached: boolean` / `onToggle: (labelId: string, next: boolean) => void` / `disabled?: boolean` | 内部状態なし | `app/_components/molecules/LabelToggleRow.tsx` |

## Organism 一覧 (ラベル機能)

| Organism | 責務 | 構成 Molecule / Atom | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `LabelCreateForm` | 新規作成 form。 `POST /api/boards/{boardId}/labels` を叩く | `LabelFormFields` + `Button` × 2 | `boardId: string` / `onCreated: (label: Label) => void` | 入力中の `name` / `color` / エラー / submitting を保持 | `app/_components/organisms/label/LabelCreateForm.tsx` |
| `LabelEditForm` | インライン編集 form。 `PATCH /api/labels/{labelId}` を叩く | `LabelFormFields` + `Button` × 2 | `label: Label` / `onSaved: (label: Label) => void` / `onCancel: () => void` | 編集中の `name` / `color` / エラー / submitting を保持 | `app/_components/organisms/label/LabelEditForm.tsx` |
| `LabelRow` | 管理画面の 1 行 (LabelBadge + 編集 / 削除アイコン)、 編集モード切替時に `LabelEditForm` を差替え | `LabelBadge` + `IconButton` × 2 + `LabelEditForm` (編集モード時) | `label: Label` / `onUpdated: (label: Label) => void` / `onDelete: (labelId: string) => void` | 表示 / 編集モードの切替 flag を保持 | `app/_components/organisms/label/LabelRow.tsx` |
| `BoardLabelsPanel` | ボード単位のラベル管理領域。 `GET /api/boards/{boardId}/labels` + 一覧描画 + `LabelCreateForm` + `ConfirmDialog` (削除) | `LabelCreateForm` + `LabelRow` × N + `EmptyStateMessage` + `Spinner` + `ConfirmDialog` | `boardId: string` | 一覧 items、 loading、 削除確認対象の `labelId` を保持 | `app/_components/organisms/label/BoardLabelsPanel.tsx` |
| `CardLabelsField` | カード詳細モーダルのラベル領域 (`design/005_card_detail_ui.md` から委譲された実定義)。 付与済みバッジ + 全ラベル選択 UI。 `POST/DELETE /api/cards/{cardId}/labels/{labelId}` + `GET /api/cards/{cardId}/labels` | `LabelBadge` × N + `LabelToggleRow` × N + `EmptyStateMessage` + `Spinner` + `InlineErrorPanel` | `card: Card` / `boardLabels: Label[]` (Context 経由も可) / `onUpdated: () => void` | 付与中 label ID セット、 楽観的トグル中フラグ、 エラーを保持 | `app/_components/organisms/label/CardLabelsField.tsx` |
| `CardLabelBadgeList` | カード行 (`CardRow`) 上の付与ラベル一覧 (読み取り専用) | `LabelBadge` × N | `labels: Label[]` / `size?: "sm" \| "md"` | 内部状態なし | `app/_components/organisms/label/CardLabelBadgeList.tsx` |

## Template

| Template | 責務 | 構成 Organism | props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `BoardLabelsPanelTemplate` | ラベル管理領域のパネル骨格 (ヘッダー + 本体 + 閉じる導線)。 パネル形式 (drawer / modal) は `ui-design/` 判断だが、 本設計では右側 drawer を初期採用する | `ModalHeader` + `BoardLabelsPanel` | `boardId: string` / `open: boolean` / `onClose: () => void` | `open` は親が制御 | `app/_components/templates/BoardLabelsPanelTemplate.tsx` |

## Page

ラベル機能は独立 Page を持たず、 既存 `BoardPage` (`app/boards/[boardId]/page.tsx`、 `design/005_card_detail_ui.md § Page` 参照) に統合する。

| Page 上の追加要素 | 責務 | 配置 |
|---|---|---|
| ボード見出し横の「ラベルを管理」 ボタン | クリックで `BoardLabelsPanelTemplate` を開く | `BoardPage` の Client 部 |
| `BoardMembersContext` と並ぶ `BoardLabelsContext` | ボード配下の全ラベルを Server Component で prisma 取得し、 `CardLabelsField` / `CardLabelBadgeList` / `BoardLabelsPanel` から参照 | `BoardPage` |

## コンポーネント関係表

| 親 | 子 | 関係 |
|---|---|---|
| `BoardPage` | `BoardLabelsPanelTemplate` | 「ラベルを管理」 ボタン押下時に mount |
| `BoardLabelsPanelTemplate` | `ModalHeader` / `BoardLabelsPanel` | slot として配置 |
| `BoardLabelsPanel` | `LabelCreateForm` / `LabelRow` × N / `EmptyStateMessage` / `Spinner` / `ConfirmDialog` | 一覧管理 |
| `LabelRow` | `LabelBadge` / `IconButton` × 2 / `LabelEditForm` (編集時) | 1 行の表示と編集切替 |
| `LabelCreateForm` | `LabelFormFields` / `Button` × 2 | 新規作成 form |
| `LabelEditForm` | `LabelFormFields` / `Button` × 2 | インライン編集 form |
| `LabelFormFields` | `FormLabel` / `TextInput` / `LabelColorPicker` / `ErrorText` × 2 | name + color 入力 |
| `LabelColorPicker` | `ColorSwatch` × 8 | 8 色パレット |
| `CardDetailModalTemplate` | `CardLabelsField` | `slots.labels` として受渡し |
| `CardLabelsField` | `LabelBadge` × N / `LabelToggleRow` × N / `EmptyStateMessage` / `Spinner` / `InlineErrorPanel` | 付与済み表示 + 選択 UI |
| `LabelToggleRow` | `LabelBadge` / `IconButton` | 1 ラベルのトグル |
| `CardRow` (既存 `design/003_cards.md`) | `CardLabelBadgeList` | カード行にバッジ列を差込 |

## 状態の所在

| 状態 | どこが持つか | 共有方法 |
|---|---|---|
| ボード配下の全ラベル一覧 | `BoardPage` の Server Component で prisma 取得、 Client 側は `BoardLabelsContext` | Context 経由で `CardLabelsField` / `CardLabelBadgeList` / `BoardLabelsPanel` |
| `BoardLabelsPanelTemplate` の開閉 | `BoardPage` の Client 部 (`useState`) | props で `open` / `onClose` を Template に渡す |
| ラベル作成中の `name` / `color` | `LabelCreateForm` (Organism 内) | 領域外に漏らさない |
| ラベル編集中の `name` / `color` | `LabelEditForm` (Organism 内) | 領域外に漏らさない |
| 削除確認対象の `labelId` | `BoardLabelsPanel` (Organism 内) | `ConfirmDialog` の `open` prop |
| カードに付与された label ID セット | `CardLabelsField` (Organism 内) | 領域外に漏らさない、 楽観的トグル state を Organism 内で完結 |
| 楽観的トグルの失敗時 rollback 対象 | `CardLabelsField` の内部 (直前 state のスナップショット) | Organism 内に閉じる |

`BoardLabelsPanel` で作成 / 編集 / 削除したラベルは `BoardLabelsContext` の refetch (Server Component 再検証) 経由で全カードのバッジ表示 (`CardLabelBadgeList`) に反映する。

## アクセシビリティ要件

| 要件 | 対応 |
|---|---|
| `ColorSwatch` の選択状態 | `role="radio"` + `aria-checked="true/false"`、 8 色を `role="radiogroup"` で束ねる (`LabelColorPicker`) |
| `LabelBadge` のスクリーンリーダー読上げ | `Badge` の `aria-label` に「ラベル: {name}」 を設定 |
| `LabelToggleRow` の付与状態 | `IconButton` の `aria-pressed="true/false"` |
| `BoardLabelsPanelTemplate` のフォーカストラップ | drawer が `role="dialog"` + `aria-modal="true"` + `aria-labelledby` で見出しを参照 |
| 色のみで区別しない | `LabelBadge` は `color` + `name` を同時表示、 `ColorSwatch` は選択時に border + check icon を追加 |
| 削除ボタンの誤操作防止 | `ConfirmDialog` の `variant="danger"` を再利用 (`design/005_card_detail_ui.md § Molecule 一覧`) |

## 実装方針

- `LabelColor` 列挙型は `app/_components/atoms/ColorSwatch.tsx` を SSOT とし、 サーバー側 zod スキーマ (`schemas/label.ts`、 `design/006_label.md § 共通ユーティリティ`) と識別子文字列を一致させる。
- 楽観的更新は `CardLabelsField` のみ採用する。 `BoardLabelsPanel` 上のラベル削除は影響範囲が広いため、 API 成功後にリスト反映する (`design/006_label.md § 楽観的更新` の初期方針)。
- `BoardLabelsPanelTemplate` は右側 drawer 形式で初期採用する。 全画面モーダルにしないのはボード本体を見ながらラベル管理する UX を想定するため。
- ラベルの `name` 一意性違反 (`422 duplicate_name`) は `LabelCreateForm` / `LabelEditForm` の `name` フィールドに `ErrorText` で inline 表示する。
- `LabelBadge` の色クラスは Tailwind の `bg-{color}-100 text-{color}-800` パターンで統一し、 `Badge` Atom 側で 8 色分の class map を持つ。
- カード行のバッジ (`CardLabelBadgeList`) はサイズ `sm`、 カード詳細モーダル内 (`CardLabelsField`) はサイズ `md` で統一する。
- `CardLabelsField` の楽観的トグルは Organism 内 hook `useOptimisticLabels(cardId)` に切り出し、 file 外に export しない。
