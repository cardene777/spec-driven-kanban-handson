# カード詳細 UI 設計

## 関連仕様・設計

- `constitution.md`
- `spec/003_cards.md`
- `spec/005_card_detail.md`
- `design/003_cards.md`
- `design/005_card_detail.md`

## 前提

本 file は 4 機能 (カード詳細 / ラベル / 期限 / 検索・絞り込み) の UI 設計の起点として、 共通 Atom の SSOT を定義する。 後続 (`design/006_label_ui.md` / `design/007_due_date_ui.md` / `design/008_search_filter_ui.md`) は本 file の Atom 一覧を参照し、 重複定義しない。

`app/_components/` は本 UI 設計時点で未作成のため、 既存 Atom は存在しない。 本 file が 12 個の共通 Atom を新規に定義し、 以降の file はそれを参照する。 既存の Organism 命名 (`CardDetailModal` / `CardList` / `CardRow` / `BoardListsView` / `ListColumn`) は `design/002_lists.md` と `design/003_cards.md` が `components/{feature}/` 配下に配置していたが、 Atomic Design 化にあたり `app/_components/organisms/{feature}/` に統一する。

## 採用する UI 設計方針

Atomic Design (Brad Frost) の 5 階層 (Atom / Molecule / Organism / Template / Page) を採用する。 階層判定は「単独で意味を持つか」 と「他の粒度に依存するか」 で行い、 以下の判定基準に従う。

| 階層 | 判定基準 | 例 |
|---|---|---|
| Atom | HTML の primitive を薄くラップ、 単独で意味を持ち他の Atom に依存しない | `Button` / `TextInput` / `Badge` |
| Molecule | 2 つ以上の Atom を組合せた最小機能単位、 特定機能に依存せず再利用可能 | `FieldRow` / `ConfirmDialog` |
| Organism | 特定機能のドメイン知識 (状態 / API 呼出 / 楽観的更新) を持つ | `CardAssigneeField` |
| Template | 画面レイアウトを定義、 データを持たず slot として Organism を受ける | `CardDetailModalTemplate` |
| Page | Next.js の `app/**/page.tsx`、 データ取得と Template への流し込み | `BoardPage` |

## 命名規則とディレクトリ構成

| 項目 | 規則 |
|---|---|
| ファイル名 | PascalCase の `.tsx` 単一ファイル |
| Component 名 | ファイル名と同一 |
| Atom 配置 | `app/_components/atoms/{Name}.tsx` |
| Molecule 配置 | `app/_components/molecules/{Name}.tsx` |
| 汎用 Organism 配置 | `app/_components/organisms/{feature}/{Name}.tsx` (feature = `card-detail` / `label` / `due-date` / `search-filter` / `board` / `list` / `card`) |
| Template 配置 | `app/_components/templates/{Name}.tsx` |
| Page 配置 | Next.js App Router 規約 (`app/**/page.tsx`) |
| CSS | Tailwind CSS の utility class を JSX 内に記述、 `className` prop で受渡し |
| Server / Client 境界 | Page と Template は Server Component、 Organism / Molecule / Atom は Client Component (`"use client"` を宣言)、 例外は該当 file で明示 |

## Atom 一覧 (SSOT、 後続 file の参照元)

以下 12 個の Atom は本 file が SSOT。 後続 file (Label / DueDate / SearchFilter) で参照する場合は「参照元 = `design/005_card_detail_ui.md § Atom 一覧`」 と明記する。

| Atom | 責務 | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|
| `Button` | 汎用ボタン | `variant: "primary" \| "secondary" \| "danger" \| "ghost"` / `size: "sm" \| "md"` / `disabled?: boolean` / `loading?: boolean` / `type?: "button" \| "submit"` / `onClick?` / `children` | 内部状態なし (`loading` は親から) | `app/_components/atoms/Button.tsx` |
| `IconButton` | アイコンのみのボタン | `icon: ReactNode` / `label: string` (a11y) / `variant?: "ghost" \| "danger"` / `size?: "sm" \| "md"` / `onClick?` | 内部状態なし | `app/_components/atoms/IconButton.tsx` |
| `TextInput` | 1 行テキスト入力 | `value: string` / `onChange: (v: string) => void` / `placeholder?: string` / `maxLength?: number` / `disabled?: boolean` / `invalid?: boolean` / `name?: string` | 制御された input (親が `value` を持つ) | `app/_components/atoms/TextInput.tsx` |
| `Textarea` | 複数行テキスト入力 | `value: string` / `onChange: (v: string) => void` / `rows?: number` / `maxLength?: number` / `placeholder?: string` / `disabled?: boolean` / `invalid?: boolean` | 制御された textarea | `app/_components/atoms/Textarea.tsx` |
| `FormLabel` | フォーム項目のラベル | `htmlFor: string` / `children` / `required?: boolean` | 内部状態なし | `app/_components/atoms/FormLabel.tsx` |
| `Badge` | 汎用バッジ (色付きラウンド矩形) | `color: "gray" \| "red" \| "orange" \| "yellow" \| "green" \| "blue" \| "purple" \| "pink"` / `size?: "sm" \| "md"` / `children` | 内部状態なし | `app/_components/atoms/Badge.tsx` |
| `Avatar` | ユーザーアバター | `name: string` / `size?: "sm" \| "md" \| "lg"` / `imageUrl?: string` | 内部状態なし、 `imageUrl` 未指定時は `name` の頭 1 文字を描画 | `app/_components/atoms/Avatar.tsx` |
| `Spinner` | ローディング表示 | `size?: "sm" \| "md"` / `label?: string` (a11y) | 内部状態なし | `app/_components/atoms/Spinner.tsx` |
| `ErrorText` | インラインエラー文言 | `children` / `id?: string` (input の `aria-describedby` 用) | 内部状態なし | `app/_components/atoms/ErrorText.tsx` |
| `EmptyStateMessage` | 空状態の文言 | `children` | 内部状態なし | `app/_components/atoms/EmptyStateMessage.tsx` |
| `Divider` | 領域区切り線 | `orientation?: "horizontal" \| "vertical"` | 内部状態なし | `app/_components/atoms/Divider.tsx` |
| `Timestamp` | 日時表示 (`<time>` 要素) | `iso: string` / `format?: "date" \| "datetime" \| "relative"` | 内部状態なし、 `relative` は現時刻依存で親側で 1 分毎再描画 | `app/_components/atoms/Timestamp.tsx` |

## Molecule 一覧 (カード詳細機能)

| Molecule | 責務 | 構成 Atom | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `FieldRow` | ラベル + 入力 + エラーの縦積み | `FormLabel` + slot + `ErrorText` | `label: string` / `htmlFor: string` / `error?: string` / `children` | 内部状態なし | `app/_components/molecules/FieldRow.tsx` |
| `ModalHeader` | モーダル上部のタイトル + 閉じる | Heading + `IconButton` | `title: string` / `onClose: () => void` | 内部状態なし | `app/_components/molecules/ModalHeader.tsx` |
| `ModalFooter` | モーダル下部のアクション行 | `Button` × N | `children` | 内部状態なし | `app/_components/molecules/ModalFooter.tsx` |
| `ConfirmDialog` | 削除確認ダイアログ | `ModalHeader` + text + `Button` × 2 | `open: boolean` / `title: string` / `message: string` / `confirmLabel?: string` / `onConfirm: () => void` / `onCancel: () => void` / `variant?: "danger" \| "primary"` | `open` は親が制御 | `app/_components/molecules/ConfirmDialog.tsx` |
| `MetaInfoRow` | 作成日 / 更新日の 2 項目表示 | `Timestamp` × 2 | `createdAt: string` / `updatedAt: string` | 内部状態なし | `app/_components/molecules/MetaInfoRow.tsx` |
| `InlineErrorPanel` | 領域内のエラー表示 + 再試行 | `ErrorText` + `Button` | `message: string` / `onRetry?: () => void` | 内部状態なし | `app/_components/molecules/InlineErrorPanel.tsx` |
| `AssigneePickerRow` | メンバー候補 1 行 (選択可) | `Avatar` + name + `Button` | `user: { id: string, name: string }` / `selected?: boolean` / `onSelect: (id: string) => void` | 内部状態なし | `app/_components/molecules/AssigneePickerRow.tsx` |
| `CommentItem` | コメント 1 行 | `Avatar` + author + `Timestamp` + body + `IconButton` | `comment: Comment` / `canDelete: boolean` / `onDelete: (id: string) => void` | 内部状態なし | `app/_components/molecules/CommentItem.tsx` |
| `CommentComposer` | 新規投稿フォーム | `Textarea` + `ErrorText` + `Button` | `onSubmit: (body: string) => Promise<void>` / `disabled?: boolean` | 入力中の `body` 文字列とエラーを Molecule 内で保持 | `app/_components/molecules/CommentComposer.tsx` |

## Organism 一覧 (カード詳細機能)

`spec/005_card_detail.md § カード詳細モーダルの拡張構造` の 6 領域を Organism として分ける。 ラベル領域と期限領域は Organism 定義を `design/006_label_ui.md` / `design/007_due_date_ui.md` に委譲する。

| Organism | 責務 | 構成 Molecule / Atom | 主要 props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `CardTitleField` | タイトル領域の表示 + インライン編集 + `PATCH /api/cards/{cardId}` (title) | `TextInput` + `Button` + `ErrorText` | `card: Card` / `onUpdated: (card: Card) => void` | `viewMode \| editing \| submitting \| error` を Organism 内で保持 | `app/_components/organisms/card-detail/CardTitleField.tsx` |
| `CardDescriptionField` | 説明文領域の表示 + インライン編集 + `PATCH /api/cards/{cardId}` (description) | `Textarea` + `Button` + `ErrorText` | `card: Card` / `onUpdated: (card: Card) => void` | 同上 | `app/_components/organisms/card-detail/CardDescriptionField.tsx` |
| `CardLabelsField` | ラベル領域 (`design/006_label_ui.md § Organism 一覧` に定義を委譲) | 委譲 | 委譲 | 委譲 | `app/_components/organisms/label/CardLabelsField.tsx` |
| `CardDueDateField` | 期限領域 (`design/007_due_date_ui.md § Organism 一覧` に定義を委譲) | 委譲 | 委譲 | 委譲 | `app/_components/organisms/due-date/CardDueDateField.tsx` |
| `CardAssigneeField` | 担当者領域。 現在の担当者表示、 選択 UI、 解除、 `PATCH /api/cards/{cardId}/assignee` | `Avatar` + `Button` + `AssigneePickerRow` × N + `InlineErrorPanel` | `card: Card` / `boardMembers: User[]` (Context 経由も可) / `onUpdated: (card: Card) => void` | `idle \| editing (候補選択中) \| submitting \| error` を Organism 内で保持 | `app/_components/organisms/card-detail/CardAssigneeField.tsx` |
| `CardCommentsSection` | コメント領域。 一覧 fetch + 楽観的追加 / 削除 + `GET/POST/DELETE /api/cards/{cardId}/comments` | `CommentItem` × N + `CommentComposer` + `EmptyStateMessage` + `Spinner` + `ConfirmDialog` | `card: Card` / `currentUser: User` / `boardRole: "owner" \| "member" \| "viewer"` | 一覧 items、 楽観的追加中フラグ、 削除確認対象の `commentId` を Organism 内で保持 | `app/_components/organisms/card-detail/CardCommentsSection.tsx` |

## Template

| Template | 責務 | 構成 Organism | props | 状態 | 配置パス |
|---|---|---|---|---|---|
| `CardDetailModalTemplate` | モーダル骨格 (ヘッダー + 6 領域の垂直配置 + フッター) の slot 提供、 モーダル背景クリック / Esc で閉じる制御 | `ModalHeader` + `MetaInfoRow` + slot × 6 (title / description / labels / due-date / assignee / comments) + `ModalFooter` (削除導線) | `card: Card` / `boardRole` / `onClose: () => void` / `onDelete: () => void` / `slots: { title, description, labels, dueDate, assignee, comments }` | モーダル自身の開閉は Page が URL クエリで持ち、 Template は開いた状態を前提とする | `app/_components/templates/CardDetailModalTemplate.tsx` |

## Page

| Page | 責務 | 使う Template | 状態 | 配置パス |
|---|---|---|---|---|
| `BoardPage` | ボード詳細画面。 URL クエリ `?card={cardId}` を読取り、 対象カードを prisma で取得して `CardDetailModalTemplate` に渡す | `CardDetailModalTemplate` (URL クエリありのとき) + 既存 `BoardListsView` | URL クエリを Server Component 側で読み、 Client Component 側は `useSearchParams` + `router.replace` で `?card=` を書換える | `app/boards/[boardId]/page.tsx` |

## コンポーネント関係表

| 親 | 子 | 関係 |
|---|---|---|
| `BoardPage` | `CardDetailModalTemplate` | URL クエリ `?card={cardId}` がある時のみ mount |
| `CardDetailModalTemplate` | `ModalHeader` / `MetaInfoRow` / 6 Organism / `ModalFooter` | slot として受渡し |
| `CardDetailModalTemplate` | `ConfirmDialog` | 削除確認をフッターの導線から発火 |
| `CardTitleField` | `TextInput` / `Button` / `ErrorText` | 編集 form 構成 |
| `CardDescriptionField` | `Textarea` / `Button` / `ErrorText` | 編集 form 構成 |
| `CardAssigneeField` | `Avatar` / `Button` / `AssigneePickerRow` / `InlineErrorPanel` | 表示 + 候補選択 |
| `AssigneePickerRow` | `Avatar` / `Button` | メンバー 1 行の表示 |
| `CardCommentsSection` | `CommentItem` × N / `CommentComposer` / `EmptyStateMessage` / `Spinner` / `ConfirmDialog` | 一覧描画 + 投稿 form + 削除確認 |
| `CommentItem` | `Avatar` / `Timestamp` / `IconButton` | 1 コメント表示 |
| `CommentComposer` | `Textarea` / `ErrorText` / `Button` | 投稿 form |
| `MetaInfoRow` | `Timestamp` × 2 | 作成 / 更新日時 |

## 状態の所在

| 状態 | どこが持つか | 共有方法 |
|---|---|---|
| モーダル開閉 (`?card={cardId}`) | `BoardPage` の URL クエリ | `useSearchParams` / `router.replace` |
| カード本体 (`card`) の初期値 | `BoardPage` (Server Component で prisma 取得) | props で `CardDetailModalTemplate` → 各 Organism |
| ボードメンバー一覧 (`boardMembers`) | `BoardPage` (Server Component で prisma 取得) | React Context (`BoardMembersContext`) 経由で `CardAssigneeField` |
| 現在ユーザー / ボードロール | `BoardPage` (認証共通ユーティリティ) | React Context (`BoardRoleContext`) 経由で全 Organism |
| タイトル / 説明文の編集中 state | `CardTitleField` / `CardDescriptionField` (Organism 内) | 領域外に漏らさない (領域独立性、 `spec/005_card_detail.md § カード詳細モーダルの拡張構造`) |
| 担当者候補選択中の state | `CardAssigneeField` (Organism 内) | 領域外に漏らさない |
| コメント一覧 items (楽観的追加 / 削除含む) | `CardCommentsSection` (Organism 内) | 領域外に漏らさない |
| 削除確認の対象 `commentId` | `CardCommentsSection` (Organism 内) | `ConfirmDialog` の `open` prop で受渡し |

領域独立性 (`spec/005_card_detail.md § カード詳細モーダルの拡張構造`) を守るため、 各 Organism は自領域の fetch / mutation state を Organism 内で完結させる。 領域間で共有する state はカード本体と boardMembers に限る。

## アクセシビリティ要件

| 要件 | 対応 |
|---|---|
| モーダルのフォーカストラップ | `CardDetailModalTemplate` が `role="dialog"` + `aria-modal="true"` + 初期フォーカスを閉じるボタンに設定 |
| Esc キーで閉じる | `CardDetailModalTemplate` が `keydown` を購読 |
| モーダル外クリックで閉じる | オーバーレイ要素の `onClick` |
| 削除ボタンの誤操作防止 | `ConfirmDialog` の `variant="danger"` で色分け + Enter キーで確定させない (Cancel が初期フォーカス) |
| `IconButton` のスクリーンリーダー読上げ | `label` prop を `aria-label` に反映 |
| `TextInput` / `Textarea` のエラー関連付け | `invalid` prop が true のとき `aria-invalid="true"` + `ErrorText` の `id` を `aria-describedby` に指定 |
| 空状態文言の役割 | `EmptyStateMessage` は `role="status"` |
| コメントリストのランドマーク | `CardCommentsSection` は `<section aria-label="コメント">` |

## 実装方針

- Atom は Presentational Component として実装し、 状態や副作用を持たない。 全ての Atom を Storybook 対象候補にする (Storybook 導入は本 file では未決)。
- Molecule は 2 つ以上の Atom を組合せた最小機能単位に留め、 API 呼出は行わない (領域内 state のみ保持可)。
- Organism が API 呼出と楽観的更新を担う。 fetch / mutation state は Organism 内に閉じ込め、 領域独立性 (`spec/005_card_detail.md`) を守る。
- Template は Server Component、 Organism / Molecule / Atom は Client Component を default とする。 Page は Server Component として prisma 取得を担当し、 fetch 済みデータを props で Template に渡す。
- カード本体の再取得は Organism の mutation 成功時に `onUpdated` callback で親 (`CardDetailModalTemplate` → `BoardPage`) に伝搬させ、 Server Component 側の revalidate (`revalidatePath("/boards/[boardId]")`) を行う。
- Tailwind CSS の色 / サイズ / 影の設計トークン (例 `badge-color-red`) は本 file では固定せず、 Atom 実装時に決める。 `Badge` の `color` prop の 8 種は `spec/006_label.md § 事前定義された色パレット` と一致させる。
- `useCardComments` / `useCardAssignee` 等の hook は Organism 内に閉じ、 file 単位で export しない (領域独立性を守るため他 Organism から再利用させない)。
