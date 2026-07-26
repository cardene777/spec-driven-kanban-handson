---
name: design-system
description: ブランド方針を入力として受け取り、shadcn/uiの導入、`brand.json`、デザイントークン、グローバルスタイル、AppShellを生成し、既存UIをトークンとshadcnコンポーネント経由の記述に置き換える
---

# /design-system

見た目の方針を実装へ反映するためのデザインシステム基盤を作るSkill。
色、余白、書体、角丸、影のような繰り返し使う値を先に定義し、`shadcn/ui` の再利用可能なコンポーネントを導入します。`AppShell` でサイドバーとヘッダーの共通レイアウトを整え、個別の色コードやピクセル値の直接指定を減らします。直接指定を残す箇所は、理由と代替のトークンを記録します。

`/ui-design` がコンポーネントの構造分類（Atom / Molecule / Organism）を扱うのに対し、`/design-system` は見た目の値とアプリ全体のレイアウトを扱う。通常は `/ui-design` の後、`/tdd` や後続の `/implement` の前に呼ぶ。

## トリガー条件

- 「デザインシステムを入れて」、「shadcn を導入して」、「見た目を統一して」、「sidebar layout にして」
- 既存 UI が動いているがトーンがバラバラで揃っていないと感じたとき
- 新規プロジェクトで初期実装が終わり、以降の機能実装を統一トーンと共通 layout で進めたいとき

## 入力

- `constitution.md` (技術スタック、既存の見た目方針があれば参照)
- 既存の `app/globals.css` と各コンポーネント
- ユーザーとの対話で決めるブランド方針
  - トーン (Linear / Notion / Vercel / Attio / Height / Trello Modern など)
  - アクセント色 1 色
  - 書体 (system font / Google Fonts など)
  - 角丸・余白・影の目安
  - layout preference (sidebar 有無、header 内容)

## 出力

以下 6 種類を生成する。

- `brand.json` (ブランド方針の SSOT)
- `app/tokens.css` (CSS 変数として書き出したデザイントークン)
- `app/globals.css` (shadcn theme を brand token に mapping する起点)
- `components.json` (shadcn/ui 設定、`npx shadcn init` が生成)
- `components/ui/*.tsx` (shadcn component 群、Button / Card / Dialog / Avatar / Badge / Separator / Input / Label / Textarea / DropdownMenu / Table 等)
- `components/layout/AppShell.tsx` (sidebar + top header の共通 layout component)

さらに既存の `app/**/page.tsx` と `components/**/*.tsx` を refactor する。

- 色コード直書きと px 直書きを検出しトークン参照に置換
- この時点で存在する主要pageを `AppShell` で包む。後続で作るpageには作成時に同じルールを適用する
- 存在するform系componentをshadcnのButtonとInputで置換

### `brand.json` のテンプレート

```json
{
  "name": "{アプリ名}",
  "tone": "{linear | notion | vercel | attio | height | trello-modern}",
  "palette": {
    "primary": { "50": "#...", "500": "#...", "600": "#...", "700": "#..." },
    "neutral": { "0": "#...", "50": "#...", "100": "#...", "200": "#...", "300": "#...", "400": "#...", "500": "#...", "600": "#...", "700": "#...", "800": "#...", "900": "#..." },
    "semantic": { "success": "#...", "warning": "#...", "danger": "#..." }
  },
  "typography": {
    "font-sans": "{フォントスタック}",
    "font-serif": "{フォントスタック、serif tone で使う場合}",
    "font-mono": "{フォントスタック}"
  },
  "spacing": { "unit": 4, "scale": [0, 4, 8, 12, 16, 24, 32, 48, 64] },
  "radius": { "sm": "{px}", "md": "{px}", "lg": "{px}", "full": "9999px" },
  "shadow": { "sm": "...", "md": "...", "lg": "..." }
}
```

### `app/tokens.css` のテンプレート

`app/globals.css` の `:root` は `--brand-neutral-200` などの中間段を参照するので、neutral は 0 / 50 / 500 / 900 の 4 段だけでなく `brand.json` の 10 段 (0〜900) をすべて書き出す。中間段を省くと globals.css 側が未定義変数を参照して見た目が崩れる。

```css
:root {
  --brand-primary-50: {palette.primary.50};
  --brand-primary-500: {palette.primary.500};
  --brand-primary-600: {palette.primary.600};
  --brand-primary-700: {palette.primary.700};

  --brand-neutral-0: {palette.neutral.0};
  --brand-neutral-50: {palette.neutral.50};
  --brand-neutral-100: {palette.neutral.100};
  --brand-neutral-200: {palette.neutral.200};
  --brand-neutral-300: {palette.neutral.300};
  --brand-neutral-400: {palette.neutral.400};
  --brand-neutral-500: {palette.neutral.500};
  --brand-neutral-600: {palette.neutral.600};
  --brand-neutral-700: {palette.neutral.700};
  --brand-neutral-800: {palette.neutral.800};
  --brand-neutral-900: {palette.neutral.900};

  --brand-success: {palette.semantic.success};
  --brand-warning: {palette.semantic.warning};
  --brand-danger: {palette.semantic.danger};

  --brand-font-sans: {typography.font-sans};
  --brand-font-serif: {typography.font-serif};

  --brand-radius-sm: {radius.sm};
  --brand-radius-md: {radius.md};
  --brand-radius-lg: {radius.lg};
  --brand-radius-full: {radius.full};
  --brand-shadow-sm: {shadow.sm};
  --brand-shadow-md: {shadow.md};
  --brand-shadow-lg: {shadow.lg};
}

@media (prefers-color-scheme: dark) {
  :root {
    --brand-neutral-0: {dark bg};
    --brand-neutral-900: {dark text};
  }
}
```

### `app/globals.css` のテンプレート

`npx shadcn init` は既存のグローバルCSSや設定ファイルを更新することがある。変更範囲を固定せず、実行前後の差分を確認する。既存の `:root` や `body` 定義、ブランド用のトークン定義を残す必要がある場合は、生成された構成に合わせて統合する。

`init` が追加・更新する `@import` の行や依存パッケージは、CLIの版と初期化時の設定で変わる。生成後の差分と `package.json` を確認し、ブランド用のトークンと矛盾しない形で統合する。

```css
@import "tailwindcss";
@import "./tokens.css";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

/* class 方式の dark 定義 (`&:is(.dark *)` や `.dark {}` block) が存在する場合は、
   prefers-color-scheme でトーンを切り替える方針と衝突する。
   ブランド方針が OS のダーク設定に追従する場合は、custom-variant を media query に再定義し、
   明暗の反転は tokens.css の @media ブロックに一本化する。 */
@custom-variant dark (@media (prefers-color-scheme: dark));

@theme inline {
  --color-primary: var(--brand-primary-600);
  --color-primary-50: var(--brand-primary-50);
  --color-primary-500: var(--brand-primary-500);
  --color-primary-600: var(--brand-primary-600);
  --color-primary-700: var(--brand-primary-700);
  --color-primary-foreground: var(--brand-neutral-0);
  --color-background: var(--brand-neutral-0);
  --color-foreground: var(--brand-neutral-900);
  --font-sans: var(--brand-font-sans);
  --font-heading: var(--brand-font-serif);
}

:root {
  --background: var(--brand-neutral-0);
  --foreground: var(--brand-neutral-900);
  --primary: var(--brand-primary-600);
  --primary-foreground: var(--brand-neutral-0);
  --card: var(--brand-neutral-0);
  --border: var(--brand-neutral-200);
  --ring: var(--brand-primary-500);
  --sidebar: var(--brand-neutral-50);
  --sidebar-primary: var(--brand-primary-600);
  --sidebar-accent: var(--brand-primary-50);
  --radius: var(--brand-radius-md);
}
```

`--font-heading` の定義だけでは shadcn の `CardTitle` / `DialogTitle` / `SheetTitle` に自動適用されない。serif トーンを選ぶ場合はこの変数を定義したうえで、対象の見出しへ `font-heading` class を明示的に付ける。

### `components/layout/AppShell.tsx` の構造

```tsx
type Props = {
  user: { id: string; name: string; email: string };
  boards: { id: string; title: string }[];
  activeBoardId?: string;
  breadcrumb?: { label: string; href?: string }[];
  children: React.ReactNode;
};

// 左 sidebar: brand + navigation + 最近のボード + user footer
// 上 header: breadcrumb + 通知 bell + user avatar
// main: children (page 固有 content)
```

## 作業手順

1. **入力ファイル確認**

   `constitution.md` と `app/globals.css` を読み、既存の見た目方針とテック選択を把握する。

2. **ブランド方針の対話決定**

   トーン / アクセント色 / 書体 / 角丸・余白 / layout preference をユーザーとの対話で確定する。
   トーンは「Linear」「Notion」「Vercel」「Attio」「Height」「Trello Modern」等の参照例で合意し、パレットと書体は参照例からデフォルト値を提示する。
   例: Height tone → warm cream bg + terracotta accent + serif heading。

3. **shadcn/ui の install**

   初期化前に `components.json`、`components/ui/`、`app/globals.css` の有無を確認する。既存ファイルを上書きする場合は、対象ファイルと理由を示して確認を取ってから `npx shadcn@latest init --defaults --force` を実行する。初期化済みで上書きが不要な場合は `--force` を付けない。
   `Button` がすでに生成されている場合は再追加しない。続けて必要なコンポーネントを `npx shadcn@latest add` で追加する。既存componentを上書きする必要がある場合は、対象と理由を示して確認を取る。
   実行後に、生成された `components.json`、依存パッケージ、`Button` のAPIを確認する。選択されたbaseやコンポーネントAPIはCLIの版と初期化時の選択で変わる。リンクをボタン風に見せる場合も、生成されたコンポーネントのAPIに従う。あわせて、次の点を確認する。
   - 初期化で生成されるファイル名・数はCLIバージョンで変わるため、件数を成功条件にせず、必要なコンポーネントを import できることを確認する。
   - コンポーネントの追加で依存パッケージが増える場合は、追加後の `package.json` と生成ファイルを確認する。まだ使わないコンポーネントは、導入理由と未使用である理由を最終報告に残す。

4. **`brand.json` 生成**

   合意した内容を出力テンプレートに沿って `brand.json` に書き出す。
   palette の各段階 (50 / 100 / 500 / 600 / 700 等) はトーンの参照例と Tailwind の hue scale を参考に決める。

5. **`app/tokens.css` 生成**

   `brand.json` の各値を CSS 変数として書き出す。プレフィックスは `--brand-*` で統一する。
   neutral は 10 段すべて書き出す (globals.css が中間段を参照するため)。
   OSのダーク設定に追従する方針を選んだ場合は、`prefers-color-scheme: dark` で切り替える。class方式のdark定義が存在する場合は方針が衝突するため、手順6でcustom-variantをmedia query側に再定義して一本化する。常時ライトの方針では、この設定を追加しない。

6. **`app/globals.css` 更新**

   `@import "./tokens.css"` を追加し、shadcn 側の `:root` 定義 (`--background` / `--primary` / `--border` / `--sidebar` 等) をすべて `var(--brand-*)` に置き換える。
   `@theme inline` ブロックで Tailwind utility class (`bg-primary-500` など) を brand token 経由で有効化する。serif heading を選んだ場合は `--font-heading: var(--brand-font-serif)` を定義し、実際の `h1`、`CardTitle`、`DialogTitle` などに `font-heading` を適用する。

7. **`AppShell` component 生成**

   `components/layout/AppShell.tsx` を新規作成する。
   左 sidebar (brand mark + navigation + 最近のボード + user footer) + 上 header (breadcrumb + 通知 bell + user avatar) + main slot の 3 面構造。
   ダイアログで決めた tone に沿ってタイポグラフィ (serif / sans) を切り替える。

8. **存在する page を `AppShell` で包む**

   現在存在する `app/page.tsx` と生成済みのボード詳細pageを `AppShell` で包み、`boards` と `breadcrumb` props を渡す（prop名はAppShellの型定義に合わせる）。動的セグメント名は実在するファイルに合わせる。存在しないpageをこの工程で作らない。
   認証系 page が既に存在する場合は `AppShell` を使わず、full-screen 中央配置 + card panel の tone に統一する。後続セクションで認証・招待・メンバー page を作る際に、このルールを適用する。

9. **既存 UI の検出と置換**

   `app/**/*.tsx` と `components/**/*.tsx` を検索し、色コード直書き (`#[0-9a-fA-F]{3,6}` / `bg-black` / `text-white` / `bg-blue-*` / `text-gray-*` 等) と px 直書き (`p-[8px]` などの arbitrary value) を検出する。
   トークン参照 (`bg-[var(--brand-primary-500)]` / `text-[var(--brand-neutral-900)]` / `bg-primary` 等) と shadcn component (`Button` / `Card` / `Input` / `Avatar` / `Badge` 等) に置換する。
   独自 modal を shadcn の `Dialog` に置き換える場合、`DialogFooter` (削除 / 保存 / 閉じるなどの操作ボタン) は body の全内容 (説明文 / 担当者 / コメント等) の**後**に置き、ダイアログ最下部に配置する。既存実装がボタンを body の途中に置いていても、Dialog 化のタイミングで最下部へ移動する (操作ボタンが本文の間に挟まる崩れを防ぐ)。
   置換対象に含まれないネイティブ要素（`<select>` など）が残る場合は、無理に別コンポーネントへ寄せず、`border-input` / `focus-visible:ring-ring/50` などのトークン由来classを当てて見た目を統一し、残存箇所として手順11で報告する。
   操作ボタン、デバッグ表示、補助情報の具体的な見せ方は、対象機能の仕様とUI設計に従う。画面例を再現する追加指示がある場合だけ、その指示を適用する。

10. 動作確認
    `npm run build` で型とTailwind生成が通ることを確認する。画面確認は、既存の開発サーバーを停止したあとに別Terminalで `npm run start` を起動して行う。確認後は `Ctrl+C` で停止する。この時点で存在するview（boards / board detail / card modal）だけを確認する。後続で作るlogin / signup / members / invite / not-foundは、作成後に同じ確認を行う。

11. ファイル一覧の提示
    生成・更新したファイル一覧、置換した箇所の件数、置換しなかった残存箇所と理由をユーザーに提示する。

## 注意事項

- `brand.json` は SSOT なので、他ファイルから同じ値を重複定義しない
- CSS変数名はテンプレートに合わせ、`--brand-primary-*`、`--brand-neutral-*`、`--brand-font-*`、`--brand-radius-*`、`--brand-shadow-*` の分類を揃える
- パレット、書体、角丸、余白の具体値はスキル内に固定しない。ブランド方針の対話で決めた値を使う
- shadcn/uiは更新による生成差分が起きやすい。実行時のCLIバージョンと、`package.json`に解決された依存パッケージのバージョンを最後の報告へ残す
- 既存 UI に色コード直書きが多数残っている場合は、優先順位を対話で決めてから置換する
- ダークモード方針は手順 2 のトーン決定と紐付けて 1 つに決める。常時ライトのトーン (Height の warm cream など) を選んだ場合は、`app/tokens.css` の `@media (prefers-color-scheme: dark)` ブロックと `app/globals.css` の `@custom-variant dark` 再定義を省略し、init が生成した class 方式の dark 定義も残さず削除する (中途半端に残すとダークが半分だけ効いて崩れる)。OS のダーク設定に追従するトーンを選んだ場合のみ、テンプレートどおり media query に一本化する。本文の動作確認でダーク反転を確認する項目は、後者を選んだ場合だけ実施する
- `AppShell` の sidebar が不要な場合 (single page app、CLI ラッパー) はダイアログで確認して省略可
- 過去のsnapshotや完成形がrepo内にあると、rootの`tsconfig.json`が対象に含めてbuildが失敗することがある。まず対象の用途、所有者、`tsconfig.json`のinclude/excludeを確認する。移動や削除は、対象と影響を示して承認を得た場合だけ行う。実行対象ではないことを確認できる場合は、理由と対象を記録して`tsconfig.json`の`exclude`に追加する。ビルドを通すために実装中のソースを除外しない
- 図が必要な場合は ASCII 図ではなく、表または画像化できる図として出す
