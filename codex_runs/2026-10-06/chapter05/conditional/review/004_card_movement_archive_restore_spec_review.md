# カード状態仕様レビュー

レビュー日: 2026-10-06
対象: spec/004_card_movement_archive_restore.md
参照: constitutionと000/001/002/003。元仕様はこのレポート作成段階では未変更。

## サマリー
| 観点 | High | Middle | Low |
|---|---:|---:|---:|
| 曖昧表現 | 0 | 1 | 0 |
| 抜け漏れ | 3 | 1 | 0 |
| 矛盾 | 1 | 0 | 0 |
| テスト不能項目 | 0 | 0 | 0 |

## 1. 抜け漏れ [High] 移動範囲
- 問題箇所: evidence/section03-before-review.md:9〜10（元spec/004の写し）
- 問題の理由: 別ボードのリストに移動できるか未定義
- 修正案: 同一ボードのみ、別ボード422
- 確認が必要な判断点: 本文指定の同一ボード案

## 2. 抜け漏れ [High] 2状態の関係
- 問題箇所: evidence/section03-before-review.md:6〜7（元spec/004の写し）
- 問題の理由: archive/delete両立で復元の意味が分岐
- 修正案: 両立不可とする
- 確認が必要な判断点: 本文指定の排他案

## 3. 矛盾 [High] 003のDELETEと一覧
- 問題箇所: evidence/core-spec-initial/003_cards.md:16およびevidence/section03-before-review.md:27
- 問題の理由: 物理削除/全件とsoft-delete/active既定が不一致
- 修正案: 003本体を一本化
- 確認が必要な判断点: 本文指定の003更新

## 4. 抜け漏れ [High] List削除cascade
- 問題箇所: evidence/core-spec-initial/002_lists.md:15〜16
- 問題の理由: 追加後の全状態Cardと復元可能性が曖昧
- 修正案: 全状態Cardを物理cascade、復元不可
- 確認が必要な判断点: 本文指定のcascade案

## 5. 曖昧表現 [Middle] 反復操作
- 問題箇所: evidence/section03-before-review.md:38〜39
- 問題の理由: 再archive/restoreの結果が未記載
- 修正案: 同じ状態への反復はidempotent成功、deletedからarchive・archivedからsoft-deleteは422
- 確認が必要な判断点: 通常設計案として提案、仮想読者承認

## 6. 抜け漏れ [Middle] inactive移動
- 問題箇所: evidence/section03-before-review.md:9〜10
- 問題の理由: activeのみと記載するが拒否応答未記載
- 修正案: archived/deletedの移動を422にする
- 確認が必要な判断点: 共通入力不正方針、仮想読者承認

## 全体総括
High4件（削除定義、移動スコープ、全状態cascade、排他）を本文回答で確定する。Middle2件は応答契約を通常設計として提案する。テスト不能は0件（性能は設計目標と明記）。
## 次のアクション候補
002/003/004を本文の4条件へ更新して再レビュー、設計004のみ出力。

## 更新後再レビュー
002/003/004を再照合。上述6指摘の修正を確認、残存High/Middle0。移動・一覧・削除・権限・cascade・排他を確認。実装は未確認（本節対象外）。性能は設計目標で未測定。
