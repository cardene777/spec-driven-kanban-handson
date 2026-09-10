# CHAPTER 02 ハンズオン用スキル

CHAPTER 02ミニマムハンズオンのスキル版で使う4つのスキル定義です。スキル自体は題材と技術スタックを固定しません。このハンズオンでは、プロンプト版と同じ最小カンバンを比較するため、入力で題材と技術スタックを指定します。

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

このディレクトリ配下のスキルは、すでにこのハンズオンに配置されています。別の作業ディレクトリでCHAPTER 02のスキル版を試す場合は、リポジトリのルートから次のようにコピーします。

```bash
# プロジェクト単位で使う場合
mkdir -p .claude/skills
cp -r minimum_handson/simple_skill/.claude/skills/{constitution,spec,design,implement} .claude/skills/

# ユーザー単位で使う場合
mkdir -p ~/.claude/skills
cp -r minimum_handson/simple_skill/.claude/skills/{constitution,spec,design,implement} ~/.claude/skills/
```

コピー後、Claude Codeを再起動すれば `/constitution` `/spec` `/design` `/implement` が使えるようになります。

## 適用範囲

この4スキルは、別のテーマにも転用できます。`/constitution` と各スキルへの入力で、対象プロジェクトの技術スタック、要件、制約、出力先を与えてください。確認手順や出力先などワークフロー自体を変えたい場合だけ、`SKILL.md`を編集します。

## CHAPTER 05で扱う強化スキル

CHAPTER 05では、同じ4つの役割を強化し、以下のスキルを追加します。

- `/ui-design` UIをAtomic Designで整える
- `/test` 仕様からテストを生成する
- `/tdd` Red-Green-Refactorを自動運転する
- `/spec-review` 仕様自体の曖昧さを検出する
- `/review` 生成コードを仕様と突き合わせる
- `/document` 仕様と実装からドキュメントを生成する

CHAPTER 02のスキルはあくまで「最小の体験」用です。
CHAPTER 05で強化版に乗り換えても、4スキルの呼び出し順序は変わらないので、本章で身につけたフロー感覚はそのまま活きます。
