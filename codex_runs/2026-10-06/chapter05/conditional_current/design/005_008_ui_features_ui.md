# 005〜008 Atomic Design UI設計（未実装）
## 関連仕様・設計
spec/design 005〜008、constitution、既存components/Kanban。4機能を一文書に集約。
## コンポーネント分類
|層|要素/責務|props|状態|配置|扱い|
|---|---|---|---|---|---|
|Atom|Button/Input/Textarea/InlineError/Label|native属性/message|親制御|既存Kanban内→components/ui|再利用、05でshadcn置換|
|Atom|LabelChip/ColorSwatch|label/color/selected/onSelect|なし|components/atoms/|新規案|
|Atom|DueDateBadge|dueDate/overdue|なし|components/atoms/|新規案|
|Molecule|TitleDescriptionEditor|title/description/onChange/errors|親から制御|components/molecules/|既存詳細入力再利用|
|Molecule|LabelPicker/LabelEditor|labels/selected/onChange|選択開閉|components/molecules/|chip/swatch再利用|
|Molecule|DueDateEditor|dueDate/onChange/errors|入力値|components/molecules/|badge再利用|
|Molecule|AssigneePicker/CommentComposer|users/assignees/onAdd、body/onSubmit|入力値|components/molecules/|009/010契約待ち|
|Molecule|SearchFilterBar|q/label/due/assignee/status/onChange|上位制御|components/molecules/|新規案|
|Organism|CardDetailDialog|card/onSave/onClose|開閉/編集中/送信/error|components/organisms/|初期dialog再利用、後続領域追加未実装|
|Organism|LabelManager/CardList|labels/cards/onEdit/onOpen|取得状態|components/organisms/|上記部品再利用|
|Template|BoardTemplate|header/filter/lists/dialog slots|なし|components/templates/|新規案|
|Page|BoardPage|boardId|サーバー取得値/フィルタ唯一所有|app/boards/[boardId]/page.tsx|既存再利用|
## コンポーネント関係表
BoardPage→BoardTemplate→SearchFilterBar/CardList/CardDetailDialog。Dialog→TitleDescriptionEditor/LabelPicker/DueDateEditor/AssigneePicker/CommentComposer→各Atom。LabelManager→LabelEditor→同じChip/Swatch。
## 命名と配置
PascalCase.tsx。atomsは表示中心でAPIを呼ばない。画面API/共有検索条件はPageのClient controller。既存Kanbanを将来分割し重複を作らない。
## 状態の所在
永続Card/Labelはサーバー、取得cacheはPage controller。検索条件一箇所Page、子はpropsとonChange。Dialogの開閉/編集draft/送信はDialog。エラーは操作所有者。
## アクセシビリティ
Dialog名前/説明、開くと題名へfocus、Tabを内側へ捕捉、Esc閉じる、終了時triggerへ復帰。各入力label、入力error aria-describedbyとalert、色だけで判別させず名称併記、keyboard Enter/Space操作、未設定/空結果live通知。
## 実装方針
詳細の全領域後にfooter（保存/閉じる/削除/archive）。期限は絶対日付を基礎に相対表現を併記する案、タイムゾーン未決のまま値を固定しない。検索title/description/commentとlabel/due/assignee/archive条件は一所有者。
本節は設計のみ、ラベル/期限/検索/担当者/コメントUIは実装しない。
