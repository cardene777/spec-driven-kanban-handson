/design-system

constitution.md、既存のスタイル、ページ、コンポーネントを読み、以下のブランド方針を適用してください。

暖かみのあるクリーム色を基調にして、テラコッタをアクセントにしてください。
アクセント色にはterracotta（#c85a3c）を使います。白い文字を載せる操作部品の背景には、濃いterracotta（#a8482e）を使ってください。
本文には、-apple-system、BlinkMacSystemFont、Hiragino Sans、Yu Gothic UI、Yu Gothic、Segoe UI、system-ui、sans-serifの順で書体を指定します。見出しには、Charter、Iowan Old Style、Hiragino Mincho ProN、Yu Mincho、Georgia、serifの順で指定してください。
角丸は10pxを基本とし、9999pxはアバターとタグだけに使います。余白は4pxの倍数で定義し、部品間は16px、領域間は24pxにしてください。
影には、smで0 1px 2px 0 rgba(33, 30, 26, 0.06)、mdで0 4px 12px -2px rgba(33, 30, 26, 0.10)、lgで0 12px 32px -8px rgba(33, 30, 26, 0.16)を使います。
共通レイアウトは左側のサイドバーと上部のヘッダーです。表示モードは常時ライトとし、OSのダーク設定では切り替えません。画面幅は1400pxのデスクトップ表示を前提とし、狭い画面向けのレイアウトは実装しません。

次の条件で実装してください。

- shadcn/uiを初期化し、既存画面で使う部品だけを追加してください。
- brand.json、app/tokens.css、app/globals.cssを作成または更新してください。
- components/layout/AppShell.tsxを作成してください。
- app/page.tsxと、実在するボード詳細ページにAppShellを適用してください。
- サイドバーにはブランド名、ナビゲーション、最近のボード、ユーザー情報を配置してください。
- ヘッダーにはパンくずリスト、通知、ユーザーのアバターを配置してください。
- 存在しないページは作成しないでください。
- 既存のページとコンポーネントに直接指定された色、余白、角丸をデザイントークンの参照へ置き換えてください。
- 独自に実装されたボタン、入力欄、ダイアログを、導入したshadcn/uiの部品へ置き換えてください。
- package.jsonに定義されたビルドを実行してください。
- package.jsonにlintとtestが定義されている場合は、どちらも実行してください。
