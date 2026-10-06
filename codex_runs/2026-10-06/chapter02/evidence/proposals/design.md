# 最小構成カンバンの設計

## 参照する仕様

constitution.md、spec/00_common.md、spec/01_board.md、spec/02_list.md、spec/03_card.md、spec/04_card_edit.mdをすべて参照する。

## データモデル

| モデル | フィールド | 関係 | 並び順 |
|---|---|---|---|
| Board | id String、title String、createdAt DateTime | lists List[] | createdAt降順 |
| List | id String、title String、order Int、boardId String、createdAt DateTime | board Board、cards Card[] | 同じBoardでorder昇順 |
| Card | id String、title String、description String?、order Int、listId String、createdAt DateTime | list List | 同じListでorder昇順 |

FR-COM-001。Prismaのidはcuid()で生成、createdAtはnow()。外部キーで親子を保持する。これらはID生成と保存の実装方法であり、新しい利用者条件は追加しない。SQLiteはローカルDB、Prisma 7のprisma.config.tsで接続先を設定し、SQLite adapterからClientに接続する。migrationとClient生成を実行する。

## API設計

| メソッド | パス | 入力 | 成功時 | 異常系 |
|---|---|---|---|---|
| GET | /api/boards | なし | 200、Board配列 | 機能入力による異常なし |
| POST | /api/boards | JSON {title} | 201、作成Board | 400 VALIDATION_ERROR |
| GET | /api/boards/[id]/lists | Board id | 200、List配列 | 404 NOT_FOUND |
| POST | /api/boards/[id]/lists | Board id、JSON {title} | 201、作成List | 404 NOT_FOUNDを優先、400 VALIDATION_ERROR |
| GET | /api/lists/[id]/cards | List id | 200、Card配列 | 404 NOT_FOUND |
| POST | /api/lists/[id]/cards | List id、JSON {title,description?} | 201、作成Card | 404 NOT_FOUNDを優先、400 VALIDATION_ERROR |
| PATCH | /api/cards/[id] | Card id、JSON {title} | 200、更新Card | 404 NOT_FOUNDを優先、400 VALIDATION_ERROR |

成功JSONはPrismaデータをそのまま返す。エラーはFR-COM-004の形で統一する。JSONが読めない、titleが文字列でないときもタイトル検証失敗として400。ただし親・対象不存在時はJSONを読む前に404。description省略時null。削除・移動・認証APIは作らない。

## 画面構成

| 画面 | パス | 表示するもの | 操作 |
|---|---|---|---|
| ボード一覧 | / | Boardカード、新規ボード作成 | フォーム開閉、タイトル送信、詳細への遷移 |
| ボード詳細 | /boards/[id] | ボード名、横並びList、各List内縦並びCard | リスト作成、カード追加、カードタイトルクリック・blur保存 |

FR-BOARD-001/002、FR-LIST-001/002、FR-CARD-001/002、FR-EDIT-001。作成成功後はフォームを閉じ再取得。失敗時は画面にエラーを表示し、Card編集失敗時は保存済みタイトルを保持する。存在しないBoardの詳細はNext.jsのnotFoundで404。

## バリデーション

| 対象 | 制約 | 失敗時 |
|---|---|---|
| Board/List.title | trim()後にstring.lengthで1〜100 | 400 VALIDATION_ERROR、追加なし、画面エラー |
| Card.title作成/編集 | trim()後にstring.lengthで1〜200 | 400 VALIDATION_ERROR、追加/更新なし、画面エラー、編集前タイトル保持 |
| Board/List/Card対象 | Prisma findUniqueによる存在確認 | 404 NOT_FOUND、title検証より先 |

FR-COM-002/004。共有関数でトリムと文字数検証を行う。

## データ取得と並び順

- 画面はServer ComponentでPrismaから直接取得。GET APIも実装し検証する。
- フォームとインライン編集はClient Component。POST/PATCH成功時にrouter.refresh()で再取得する。
- BoardはcreatedAt降順。List/Cardは同じ親内でorder昇順。
- 同時作成は対象外。親内で0件ならorder=0、以降最大order+1。順次作成時に重複しない。
- 対象不存在404を先に返し、その後にタイトル検証400。

## 実装順序

1. Next.js、TypeScript、Tailwind CSS、ESLint、Prisma、SQLite、Vitestを初期化。
2. データモデル、初期migration、Client生成。
3. 共通バリデーションとエラー、データアクセス。
4. 7つのAPI。
5. 一覧と詳細、作成フォーム、blur編集。
6. テスト専用SQLiteへ同じmigrationを適用し、実DBで正常作成・表示・順序・検証・404優先・編集保持をテスト。
7. constitutionのlint、typecheck、test、buildを順番に実行。
8. ブラウザで全主要操作・異常入力・reload保存、HTTPでAPI結果を照合する。

## 未決事項

なし。認証・権限管理・招待・ドラッグ&ドロップ・削除/復元・Atomic Designは対象外。機密データを扱う機能は追加しない。
