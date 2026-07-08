# 第2章 ハンズオン用スキル

第2章 ミニマムハンズオン の第2段で使う4つのスキル定義です。
読者は、これらをそのままコピーするか、自分のテーマに合わせて手を入れて使うことを想定しています。

## スキル一覧

| スキル | 役割 | 使うタイミング |
|---|---|---|
| `/constitution` | プロジェクトの技術スタック・規約・原則を定義 | プロジェクト立ち上げ時に1度 |
| `/spec` | 機能の自然言語要望から構造化仕様を生成 | 新機能を実装する前 |
| `/design` | 仕様からデータモデル・API・UI設計を生成 | specができたあと |
| `/implement` | 設計からコード一式を生成 | designができたあと |

## 想定する呼び出し順序

```text
/constitution   ← プロジェクト初回のみ
    ↓
/spec           ← 機能ごとに繰り返す
    ↓
/design         ← 機能ごとに繰り返す
    ↓
/implement          ← 機能ごとに繰り返す
```

## 自分のClaude Codeに導入する方法

このディレクトリ配下のスキルを、自分のClaude Codeのskillsディレクトリにコピーします。

```bash
# プロジェクトルートで実行（プロジェクト単位で使う場合）
mkdir -p .claude/skills
cp -r chapters/02_minimum_handson/skills/{constitution,spec,design,implement} .claude/skills/

# またはユーザー単位で使う場合
mkdir -p ~/.claude/skills
cp -r chapters/02_minimum_handson/skills/{constitution,spec,design,implement} ~/.claude/skills/
```

コピー後、Claude Codeを再起動すれば `/constitution` `/spec` `/design` `/implement` が使えるようになります。

## 自分のテーマに合わせてカスタマイズする

各スキルのSKILL.mdは最小構成です。
自分のテーマに合わせて以下のような変更ができます。

- `/constitution` テンプレートのセクションを増減する
- `/spec` フィールドや異常系の項目を増減する
- `/design` UI構造の表現をFigmaリンク等に変える
- `/implement` 生成ファイルの配置を変える

スキルの記述はMarkdownなので、その場でファイルを編集すれば反映されます。

## 第5章で扱う強化スキル

第5章では、これら4スキルを「強化版」に置き換え、さらに以下を追加していきます。

- `/ui-design` UIをAtomic Designで整える
- `/test` 仕様からテストを生成する
- `/tdd` Red-Green-Refactorを自動運転する
- `/spec-review` 仕様自体の曖昧さを検出する
- `/review` 生成コードを仕様と突き合わせる
- `/document` 仕様と実装からドキュメントを生成する

第2章のスキルはあくまで「最小の体験」用です。
第5章で強化版に乗り換えても、4スキルの呼び出し順序は変わらないので、本章で身につけたフロー感覚はそのまま活きます。
