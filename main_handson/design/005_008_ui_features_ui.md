# カード詳細・ラベル・期限・検索/絞り込み UI設計（Atomic Design）

4機能（spec/005-008・design/005-008）をまたいで、Atom / Molecule / Organism / Template / Page の責務層に UI 要素を整理する。

## 関連仕様・設計

- spec/005_card_detail.md / spec/006_label.md / spec/007_due_date.md / spec/008_search_filter.md
- design/005_card_detail.md / design/006_label.md / design/007_due_date.md / design/008_search_filter.md
- constitution.md（Next.js 16 App Router / Tailwind、デザインシステム未導入）

## 前提と方針

- **デザインシステム未導入**（`components/ui/` なし）。Atom 層の primitive（button/input/select/textarea/label）は **native 要素 + Tailwind** に写像し、同名 Atom を新規コンポーネント化しない（既存 UI の記述踏襲）。
- **配置は既存の機能別フラット構成**（`app/boards/[boardId]/_components/`）に合わせる。`atoms/` 等の階層ディレクトリは新設しない（Atomic Design は責務分類として使用）。
- Server/Client 境界: データ取得は Server Component（`page.tsx`）、操作を伴う部品は `"use client"`。
- **既存部品は再利用**。新規は「ラベル・期限・検索」に固有の部品のみ。

## コンポーネント分類（機能横断）

### Atom（最小要素・native + Tailwind 中心）

| コンポーネント | 役割 | props | 状態の所在 | 配置パス | 新規/再利用 |
|---|---|---|---|---|---|
| TextInput / TextArea / Select / DateInput | 入力 primitive | native `<input>/<textarea>/<select>/<input type=date>` + Tailwind | なし（親が value 制御） | 各部品内にインライン | 再利用（既存踏襲・新規化しない） |
| Button（primary/secondary/danger） | 操作ボタン | native `<button>` + Tailwind クラス | なし | 各部品内にインライン | 再利用（既存踏襲） |
| InlineError | エラーメッセージ表示（`text-xs text-red-600`） | `message` | なし | 各部品内にインライン | 再利用（既存パターン） |
| LabelChip | ラベル1件をチップ表示（name+color） | `label`, `onRemove?` | なし | `app/boards/[boardId]/_components/LabelChip.tsx` | 新規 |
| ColorSwatch | 事前定義色1つの選択スウォッチ | `color`, `selected`, `onSelect` | なし | `app/boards/[boardId]/_components/ColorSwatch.tsx` | 新規 |
| DueDateBadge | 期限バッジ（日付表示・期限切れ強調） | `dueDate`, `overdue` | なし | `app/boards/[boardId]/_components/DueDateBadge.tsx` | 新規 |

### Molecule（Atom の組み合わせ・単一責務）

| コンポーネント | 役割 | props | 状態の所在 | 配置パス | 新規/再利用 |
|---|---|---|---|---|---|
| LabelPicker | ボードのラベル一覧から付与/解除（ColorSwatch/LabelChip を利用） | `cardId`, `boardLabels`, `assigned` | 選択パネル開閉・付与状態（自身、確定後 refresh） | `app/boards/[boardId]/_components/LabelPicker.tsx` | 新規 |
| ColorPicker | 事前定義8色の選択（ColorSwatch 群） | `value`, `onChange` | なし（親が value） | `app/boards/[boardId]/_components/ColorPicker.tsx` | 新規 |
| DueDateField | 期限の表示/設定/変更/解除（DateInput + DueDateBadge + 解除ボタン） | `cardId`, `dueDate` | 編集中日付（自身、確定後 refresh） | `app/boards/[boardId]/_components/DueDateField.tsx` | 新規 |
| LabelForm | ラベル作成/編集フォーム（TextInput + ColorPicker） | `boardId`, `label?`, `onSaved` | 入力値・エラー（自身） | `app/boards/[boardId]/_components/LabelForm.tsx` | 新規 |
| SearchBar | キーワード入力（TextInput、0〜100） | `value`, `onChange` | なし（親 SearchFilterBar が保持） | `app/boards/[boardId]/_components/SearchBar.tsx` | 新規 |
| FilterControls | ラベル/期限/状態セレクト群 | `boardLabels`, `filters`, `onChange` | なし（親が保持） | `app/boards/[boardId]/_components/FilterControls.tsx` | 新規 |

### Organism（機能単位のまとまり）

| コンポーネント | 役割 | props | 状態の所在 | 配置パス | 新規/再利用 |
|---|---|---|---|---|---|
| CardDetailModal | カード詳細モーダル（title/description 編集 + LabelPicker + DueDateField + アーカイブ/削除）。**既存 CardItem のモーダルを拡張** | `card`, `boardLabels` | モーダル開閉・編集値（自身、確定後 refresh） | `app/boards/[boardId]/_components/CardItem.tsx`（拡張） | 再利用（拡張） |
| LabelManager | ボードのラベル作成/編集/削除の管理パネル（LabelForm + LabelChip 一覧） | `boardId`, `boardLabels` | パネル開閉（自身、refresh 反映） | `app/boards/[boardId]/_components/LabelManager.tsx` | 新規 |
| SearchFilterBar | 検索/絞り込みバー（SearchBar + FilterControls）。適用で検索 API を呼び結果を Board に反映 | `boardId`, `boardLabels`, `onResult` | 検索条件（自身）、結果（親 or 自身） | `app/boards/[boardId]/_components/SearchFilterBar.tsx` | 新規 |
| Board | リスト列＋カード（D&D）。**検索適用時は表示カードを結果で差し替え** | `columns`, `filteredCardIds?` | ドラッグ状態（自身） | `app/boards/[boardId]/_components/Board.tsx`（拡張） | 再利用（拡張） |
| ArchivePanel | アーカイブ/ゴミ箱一覧と復元/完全削除 | `lists` | 開閉・取得結果（自身） | `app/boards/[boardId]/_components/ArchivePanel.tsx` | 再利用（既存） |
| BoardHeader / ListHeader | ボード名・リスト名編集/削除 | 既存のまま | 自身 | 既存パス | 再利用（既存） |

### Template（画面レイアウト・データの器）

| コンポーネント | 役割 | props | 状態の所在 | 配置パス | 新規/再利用 |
|---|---|---|---|---|---|
| BoardDetailLayout | ボード詳細の領域構成（ヘッダー / 検索バー / ラベル管理 / Board / アーカイブパネル）。Server で取得したデータを各 Organism に渡す | `board`, `columns`, `boardLabels`, `lists` | なし（Server 取得を配分、操作状態は各 Organism） | `app/boards/[boardId]/page.tsx` 内（構成）/ 必要なら分離 | 再利用（既存 page 拡張） |

### Page（ルート・データ取得）

| コンポーネント | 役割 | props | 状態の所在 | 配置パス | 新規/再利用 |
|---|---|---|---|---|---|
| BoardDetailPage | `/boards/[id]`。board・lists・active cards・board labels を取得し Template へ渡す（Server Component） | route params | サーバー取得（force-dynamic） | `app/boards/[boardId]/page.tsx` | 再利用（既存拡張） |
| HomePage | `/` ボード一覧（本機能では変更なし） | — | サーバー取得 | `app/page.tsx` | 再利用（既存） |

## コンポーネント関係表

| 親 | 子 | 関係 |
|---|---|---|
| BoardDetailPage | BoardDetailLayout | データ取得→レイアウトへ配分 |
| BoardDetailLayout | BoardHeader / SearchFilterBar / LabelManager / Board / ArchivePanel | 領域配置 |
| SearchFilterBar | SearchBar / FilterControls | 条件入力を集約し検索 API 呼び出し |
| FilterControls | Select（Atom）×3 / LabelChip | ラベル/期限/状態の選択 |
| Board | CardDetailModal（=CardItem） / CardCreateForm / ListHeader | 列内カードとモーダル |
| CardDetailModal | LabelPicker / DueDateField / TextInput / TextArea / Button | 詳細編集領域 |
| LabelPicker | LabelChip / ColorSwatch | 付与済み表示と選択 |
| LabelManager | LabelForm / LabelChip | ラベル CRUD |
| LabelForm | TextInput / ColorPicker | 名称と色入力 |
| ColorPicker | ColorSwatch ×8 | 事前定義色選択 |
| DueDateField | DateInput / DueDateBadge / Button | 期限設定/表示/解除 |

## 命名規則とディレクトリ構成

- 既存に合わせ、ボード詳細配下は `app/boards/[boardId]/_components/*.tsx`（PascalCase 1ファイル1コンポーネント）。
- Atomic 階層のディレクトリ（`atoms/` 等）は作らない。分類はドキュメント上の責務ラベルのみ。
- primitive（button/input 等）は native 要素 + Tailwind を継続（デザインシステム未導入のため）。

## 状態の所在

| 状態 | 所有者 | 共有方法 |
|---|---|---|
| ボード/リスト/カード/ラベルのデータ | BoardDetailPage（Server 取得） | props で配布、変更後は `router.refresh()` |
| モーダル開閉・編集値 | CardDetailModal（CardItem） | 自身の useState |
| ラベル選択パネル開閉・付与 | LabelPicker | 自身、確定で API→refresh |
| 期限編集値 | DueDateField | 自身、確定で API→refresh |
| 検索条件（keyword/label/due/status） | SearchFilterBar | 自身、適用で検索 API |
| 検索結果の適用 | SearchFilterBar → Board | `filteredCardIds`（該当のみ表示）or 結果配列 |
| ドラッグ状態 | Board | 自身 |

## アクセシビリティ要件

- 色のみで意味を伝えない: LabelChip は色 + `name` テキスト、DueDateBadge は強調色 + 「期限切れ」等のテキスト/aria-label を併記。
- フォーム要素に `<label>`/`aria-label` を付与（期限 DateInput、キーワード入力、色選択）。
- モーダルは Esc で閉じ、フォーカスを内部に移す（既存モーダル挙動を踏襲）。
- 色選択スウォッチはキーボード操作可能（`<button>`）・選択状態を `aria-pressed`。
- D&D はキーボード非対応の制約があるため、並べ替えはドラッグ以外の手段（将来）を未決事項とする（本機能では現状踏襲）。

## 実装方針

- **既存部品を優先再利用**: CardItem（→CardDetailModal 拡張）、Board（検索結果反映で拡張）、ArchivePanel/BoardHeader/ListHeader はそのまま。primitive は native+Tailwind 継続。
- **新規は機能固有部品のみ**: LabelChip / ColorSwatch / DueDateBadge（Atom）、LabelPicker / ColorPicker / DueDateField / LabelForm / SearchBar / FilterControls（Molecule）、LabelManager / SearchFilterBar（Organism）。
- 事前定義色は 1 箇所（例 `lib/labelColors.ts`）に定義し、ColorSwatch/ColorPicker/LabelChip で共有（色コード→Tailwind クラス写像）。
- 検索結果の反映は Board の表示フィルタ（`filteredCardIds` に含まれるカードのみ表示、null なら全 active 表示）とし、D&D・並び順ロジックは変更しない。
- サーバー確定後は `router.refresh()` で再取得（既存パターン踏襲）。

## 作成/更新ファイル一覧（本 UI 設計ドキュメント）

- design/005_008_ui_features_ui.md（本ファイル・新規）
