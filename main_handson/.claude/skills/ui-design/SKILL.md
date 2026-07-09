---
name: ui-design
description: 本章用の`/spec`と`/design`のUI構造を入力として、Atomic Designの階層（Atom → Molecule → Organism → Template → Page）でコンポーネント設計を起こし、`design/{機能ID}_ui.md`を生成する
---

# /ui-design

Atomic Designの階層でコンポーネント設計を起こすスキル。
本章用の`/spec`と`/design`で書かれたUI構造を入力として、Atom / Molecule / Organism / Template / Pageの各層に何を配置するかを決め、コンポーネント関係表と命名規則・配置パスをまとめた設計ドキュメントを生成する。

## トリガー条件

- 「UIをAtomic Designで整理して」、「{機能名} のコンポーネント設計を起こして」
- 本章用の`/design`でUI構造を書いたあと、`/implement`の前
- 既存UIをAtomic Designでリファクタしたいとき

## 入力

- `constitution.md`（技術スタック・規約参照用）
- 対象の`spec/*.md`および`design/*.md`
- 既存の `design/*_ui.md`（横断整合チェック用）
- 既存コンポーネント `app/_components/`（重複防止用）

## 出力

`design/{機能ID}_{機能名}_ui.md` を生成する。
構成は以下のとおり。

```markdown
# {機能名} UI設計

## 関連仕様・設計

- spec/{機能ID}_{機能名}.md
- design/{機能ID}_{機能名}.md

## Atomic Design階層

### Atom（最小単位）

| コンポーネント | 役割 | 配置パス | 既存 / 新規 |
|---|---|---|---|
| Button | 汎用ボタン | app/_components/atoms/Button.tsx | 既存 |
| Badge | 色付きタグ | app/_components/atoms/Badge.tsx | 新規 |

### Molecule（Atomの組み合わせ）

| コンポーネント | 役割 | 構成するAtom | 配置パス |
|---|---|---|---|
| LabelChip | ラベル表示 | Badge + Icon | app/_components/molecules/LabelChip.tsx |

### Organism（Moleculeの組み合わせ）

| コンポーネント | 役割 | 構成するMolecule | 配置パス |
|---|---|---|---|
| CardDetail | カード詳細パネル | LabelChip + DueDateChip + AssigneeAvatar | app/_components/organisms/CardDetail.tsx |

### Template（レイアウトの骨組み）

| コンポーネント | 役割 | 配置パス |
|---|---|---|
| BoardLayout | ボード画面の枠組み | app/_components/templates/BoardLayout.tsx |

### Page（実際のページ）

| コンポーネント | 役割 | 配置パス | URL |
|---|---|---|---|
| BoardPage | ボード詳細ページ | app/boards/[id]/page.tsx | /boards/[id] |

## コンポーネント関係表

| 親コンポーネント | 子コンポーネント | 階層 |
|---|---|---|
| BoardPage | BoardLayout | Template |
| BoardLayout | ListColumn | Organism |
| ListColumn | CardItem | Molecule |
| CardItem | LabelChip、DueDateChip、AssigneeAvatar | Molecule、Atom |

## 命名規則とディレクトリ構成

- ファイル名はPascalCase（`CardDetail.tsx`）
- ディレクトリはAtomic Designの階層名（atoms / molecules / organisms / templates）
- `app/_components/{階層}/` に配置
- Pageだけは `app/{path}/page.tsx` のフレームワーク慣習に従う

## 状態の所在

| 状態 | どの層が持つか | 共有方法 |
|---|---|---|
| 開閉状態 | 親Organism | useState |
| サーバーデータ | Page | Server Componentのfetch |
| 編集中の値 | Molecule | useState、確定時に親に通知 |

## アクセシビリティ要件

- すべてのAtomはaria-labelを必須にする
- フォーカス順序はTabキーで論理順に
- 色だけに依存しない（テキストやアイコンを併用）

## 実装方針

- 1ファイル1コンポーネント
- Atomは副作用を持たない（fetch・状態管理はしない）
- OrganismまではServer Componentを基本とし、状態が必要な箇所のみClient Component
- Tailwind CSS[5]のクラスはAtom内で完結させ、上位層はレイアウト指定のみ
```

## 作業手順

1. 入力ファイル確認
   `constitution.md` と対象 `spec/*.md` `design/*.md` を読み込む。
2. 既存UI設計確認
   既存 `design/*_ui.md` をGlobで探し、既存コンポーネントを把握する。
3. 既存コンポーネント確認
   既存 `app/_components/` をGlobで探し、重複コンポーネントを防ぐ。
4. Atom洗い出し
   仕様のUI構造から「最小単位の見た目要素」をAtomとして洗い出す。
5. 階層設計
   Atomを組み合わせてMolecule、Moleculeを組み合わせてOrganismを決める。
6. レイアウト設計
   Templateでレイアウト枠組み、Pageでルート対応を決める。
7. UI設計整理
   コンポーネント関係表、命名規則、状態の所在、アクセシビリティ要件をまとめる。
8. ui設計生成
   出力テンプレートに従って `design/{機能ID}_{機能名}_ui.md` を生成する。
9. 重複や粒度の確認
   既存コンポーネントとの重複や粒度のぶれがあればAskUserQuestionで確認する。

## 注意事項

- 仕様にない見た目要素を勝手に追加しない。仕様に戻る
- Atomは単一責務とし、複数のAtomを同じ階層にネストしない
- 階層を跨いだ直接の状態共有は避け、PageかOrganismを通じて受け渡す
- Tailwind CSSのユーティリティクラスはAtom内で閉じる。上位層に流出させない
- PageのServer Component / Client Component境界はNext.js[1] App Routerの慣習に従う
