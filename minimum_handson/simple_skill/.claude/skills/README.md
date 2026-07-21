# 第2章 ハンズオン用スキル

第2章ミニマムハンズオンのスキル版で使う4つのスキル定義です。プロンプト版と同じ最小カンバンを比較できるよう、題材と技術スタックを固定しています。

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

このディレクトリ配下のスキルは、すでにこのハンズオンに配置されています。別の作業ディレクトリで第2章のスキル版を試す場合は、リポジトリのルートから次のようにコピーします。

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

この4スキルは第2章のカンバン用です。別のテーマへそのまま転用する用途には向きません。第5章の `main_handson/.claude/skills/` にある11スキルを使い、対象プロジェクトの `constitution.md`、仕様、設計を入力として与えてください。

## 第5章で扱う強化スキル

第5章では、汎用版の4スキルに以下を追加します。

- `/ui-design` UIをAtomic Designで整える
- `/test` 仕様からテストを生成する
- `/tdd` Red-Green-Refactorを自動運転する
- `/spec-review` 仕様自体の曖昧さを検出する
- `/review` 生成コードを仕様と突き合わせる
- `/document` 仕様と実装からドキュメントを生成する

第2章のスキルはあくまで「最小の体験」用です。
第5章で強化版に乗り換えても、4スキルの呼び出し順序は変わらないので、本章で身につけたフロー感覚はそのまま活きます。
