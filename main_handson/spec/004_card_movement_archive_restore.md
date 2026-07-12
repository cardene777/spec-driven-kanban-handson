# カード移動、アーカイブ、削除と復元の仕様

## 概要

本 file はカードのライフサイクル操作を定義する。
対象は次の 3 機能である。

- FR-001 移動: カードを同一リスト内で並び替える、カードを別リストへ移動する、リスト自体を同一ボード内で並び替える。ドラッグアンドドロップ UX を含む。
- FR-002 アーカイブ: カードを表示対象から外す (archived 状態) と、その復元。
- FR-003 削除と復元: カードを削除済み状態にする soft delete、削除済みカードの復元、および完全削除 (物理削除)。

共通ルールは `spec/000_shared_rules.md`、ボード仕様は `spec/001_boards.md`、リスト仕様は `spec/002_lists.md`、カードの基本仕様は `spec/003_cards.md`、権限と用語は `constitution.md` を参照する。

本 spec で扱わない事項は `§ 未決事項` に列挙する。

## 既存仕様との関係

本 spec は `spec/002_lists.md` と `spec/003_cards.md` に対する追補として位置付ける。
既存 spec との調整点は次の通り。

- `spec/002_lists.md § 操作: リスト並び替え` と `PATCH /api/lists/{listId}/order` は本 spec の FR-001 移動でそのまま採用する。API 仕様は既存 file を SSOT とし、本 file では境界条件と UX (ドラッグアンドドロップ) を追記する。
- `spec/003_cards.md § 操作: カード並び替え` と `PATCH /api/cards/{cardId}/order` は本 spec の FR-001 移動でそのまま採用する。API 仕様は既存 file を SSOT とし、本 file では境界条件と UX、およびリクエスト body に含めるフィールド (`sourceListId`、`targetListId`、`targetOrder`) を確定させる。
- `spec/003_cards.md § API` の `DELETE /api/cards/{cardId}` は、本 spec で「soft delete (削除済み状態への遷移)」 に意味を再定義する。物理削除は本 spec で新設する `DELETE /api/cards/{cardId}/permanent` (owner のみ) に分離する。
- `spec/003_cards.md § 権限境界` の「カード削除 (`DELETE /api/cards/{cardId}`) = `member` 以上」 は本 spec でもそのまま保持する (soft delete として)。完全削除のみ owner に限定する。

## 対象データ

### Card エンティティへの追加フィールド

`spec/003_cards.md § 対象データ` の `Card` に、状態管理用フィールドを追加する。

| フィールド | 型 | 説明 |
|---|---|---|
| `status` | 文字列 (`active` / `archived` / `deleted`) | カードのライフサイクル状態。デフォルトは `active`。 |
| `archivedAt` | ISO8601 UTC / null | アーカイブ操作を行った時刻。`status = archived` 以外では `null`。 |
| `deletedAt` | ISO8601 UTC / null | soft delete 操作を行った時刻。`status = deleted` 以外では `null`。 |

- `status` が `active` のカードのみ、既定の一覧 API (`GET /api/lists/{listId}/cards`) に含まれる。
- `status = archived` のカードは archived 専用一覧 API から取得する。
- `status = deleted` のカードは deleted (ゴミ箱) 専用一覧 API から取得する。
- 完全削除 (`DELETE /api/cards/{cardId}/permanent`) は物理削除であり、DB からレコードごと除去する。

### 状態遷移

| 現在の状態 | 操作 | 遷移後の状態 |
|---|---|---|
| `active` | アーカイブ | `archived` |
| `active` | soft delete | `deleted` |
| `archived` | 復元 | `active` |
| `archived` | soft delete | `deleted` |
| `deleted` | 復元 | `active` |
| `deleted` | 完全削除 | (レコード物理削除) |
| `active` | 完全削除 | (レコード物理削除) |
| `archived` | 完全削除 | (レコード物理削除) |

- 復元操作は「元のリスト (`listId`)」 に戻す。復元先リストが既に削除されている場合の扱いは `§ 異常系` を参照する。
- 完全削除は状態を問わず実行できる (owner のみ)。

## 機能要件

### FR-001 移動

#### FR-001-1 カードを同一リスト内で並び替える

- `spec/003_cards.md § 操作: カード並び替え` に従う。
- リクエスト body で `sourceListId` と `targetListId` が同一の場合、同一リスト内の並び替えとして扱う。
- 対象カード自身の現在位置を除いた上で、`targetOrder` 位置に挿入する。
- 並び替え後、他カードの `order` は連番相当を保つよう再計算する (再計算方式は設計工程)。

#### FR-001-2 カードを別リストへ移動する

- `spec/003_cards.md § 操作: カード並び替え` に従う。
- リクエスト body の `targetListId` が `sourceListId` と異なる場合、別リストへの移動として扱う。
- 移動元リストからカードを取り除き、残カードの `order` を詰めて再計算する。
- 移動先リストの `targetOrder` 位置に対象カードを挿入し、移動先リストの他カードの `order` を再計算する。
- 移動先リストが同一ボード内であることを検証する。別ボードのリストへの移動は本 spec の対象外。
- 移動元リストと移動先リストの `updatedAt` は変更しない (リストのメタ情報自体は変わらないため)。対象カードの `updatedAt` は更新する。

#### FR-001-3 リストを同一ボード内で並び替える

- `spec/002_lists.md § 操作: リスト並び替え` に従う。
- リクエスト body で `targetOrder` を受け取り、対象リストを指定位置に移動する。
- 同一ボード内の他リストの `order` を再計算する。
- 対象リストの `updatedAt` を更新する。

#### FR-001-4 ドラッグアンドドロップ UX

- ボード詳細画面 (`/boards/[id]`) で、カード行とリスト列にドラッグ操作を許可する。
- ドラッグ中は元の位置にプレースホルダを表示し、ドロップ位置を予告する (UI 詳細は `ui-design/`)。
- ドロップ操作の確定と同時に、対応する並び替え API を呼び出す (楽観的更新の可否は `ui-design/` と設計工程で決める)。
- API が失敗した場合、UI 上の並び順を操作前の状態に戻す (ロールバック挙動)。
- 実装ライブラリの選定は設計工程で行う (`spec/002_lists.md § 未決事項` と整合)。
- タッチデバイス対応は `ui-design/` で決める。

### FR-002 アーカイブ

#### FR-002-1 カードをアーカイブする

- カード詳細モーダル (`spec/003_cards.md § カード詳細モーダルの基本構造`) からアーカイブ操作を実行する。
- 操作対象カードの `status` を `archived` に、`archivedAt` を現在時刻に更新する。`deletedAt` は変更しない。
- アーカイブ操作は明示的な確認 (確認ダイアログ等) を伴う。UI 詳細は `ui-design/` で決める。
- アーカイブ後、対象カードは既定の一覧 API (`GET /api/lists/{listId}/cards`) から除外される。
- 対象カードの `updatedAt` を更新する。
- カードのアーカイブによって元リストの他カードの `order` を詰め直すかは設計工程で決める (初期方針: 詰めない、`order` は保持しておき復元時に元位置を試みる)。

#### FR-002-2 アーカイブ済みカードを復元する

- ボード単位のアーカイブ一覧画面 (`§ 画面` 参照) から復元操作を実行する。
- 対象カードの `status` を `active` に、`archivedAt` を `null` に更新する。
- 復元先リスト (`listId`) が現存する場合、対象カードを復元先リストの末尾に配置する (`order` は復元先リストの末尾)。
- 対象カードの `updatedAt` を更新する。

### FR-003 削除と復元

#### FR-003-1 カードを削除する (soft delete)

- カード詳細モーダル、またはアーカイブ一覧画面から削除操作を実行する。
- 対象カードの `status` を `deleted` に、`deletedAt` を現在時刻に更新する。`archivedAt` は保持する (再度復元→再アーカイブの経路は本 spec の対象外)。
- 削除操作は明示的な確認 (確認ダイアログ等) を伴う。
- 削除後、対象カードは既定の一覧 API とアーカイブ一覧 API から除外される。
- 対象カードの `updatedAt` を更新する。
- 元リストの他カードの `order` の詰め直しはアーカイブと同様、設計工程で決める (初期方針: 詰めない)。

#### FR-003-2 削除済みカードを復元する

- ボード単位の削除済み一覧画面 (ゴミ箱) から復元操作を実行する。
- 対象カードの `status` を `active` に、`deletedAt` を `null` に更新する。
- 復元先リスト (`listId`) が現存する場合、対象カードを復元先リストの末尾に配置する (`order` は復元先リストの末尾)。
- 対象カードの `updatedAt` を更新する。

#### FR-003-3 カードを完全削除する

- 削除済み一覧画面、およびアーカイブ一覧画面から完全削除操作を実行する。
- 対象カードのレコードを DB から物理削除する。
- 完全削除操作は明示的な確認 (確認ダイアログ等) を伴い、UI 上で「復元できません」 相当の警告を表示する (UI 詳細は `ui-design/`)。
- 完全削除は `owner` のみ実行可能。`member` および `viewer` が呼ぶと `403` を返す。

## 画面

- ボード詳細画面 (`/boards/[id]`) の一部として、アーカイブ一覧と削除済み一覧の導線を配置する。導線の配置と表現は `ui-design/` で決める。
- アーカイブ一覧: 対象ボード配下でかつ `status = archived` のカードを、`archivedAt` 降順で表示する。件数が 0 のときは空状態を表示する。
- 削除済み一覧: 対象ボード配下でかつ `status = deleted` のカードを、`deletedAt` 降順で表示する。件数が 0 のときは空状態を表示する。
- アーカイブ一覧のカード行は、復元操作の導線と soft delete 操作の導線を持つ (owner の場合は完全削除の導線も表示する)。
- 削除済み一覧のカード行は、復元操作の導線を持つ (owner の場合は完全削除の導線も表示する)。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| `PATCH` | `/api/cards/{cardId}/order` | カードを並び替え (既存、`spec/003_cards.md` SSOT) | 対象ボードの `member` 以上 |
| `PATCH` | `/api/lists/{listId}/order` | リストを並び替え (既存、`spec/002_lists.md` SSOT) | 対象ボードの `member` 以上 |
| `POST` | `/api/cards/{cardId}/archive` | カードをアーカイブする | 対象ボードの `member` 以上 |
| `POST` | `/api/cards/{cardId}/restore` | アーカイブ済みまたは削除済みカードを復元する | 対象ボードの `member` 以上 |
| `DELETE` | `/api/cards/{cardId}` | カードを soft delete する (既存パス、意味を本 spec で確定) | 対象ボードの `member` 以上 |
| `DELETE` | `/api/cards/{cardId}/permanent` | カードを完全削除する (物理削除) | 対象ボードの `owner` |
| `GET` | `/api/boards/{boardId}/archived-cards` | 対象ボードのアーカイブ済みカード一覧を取得 | 対象ボードの `viewer` 以上 |
| `GET` | `/api/boards/{boardId}/deleted-cards` | 対象ボードの削除済みカード一覧を取得 | 対象ボードの `viewer` 以上 |

- レスポンス形式と認証チェック順序は `spec/000_shared_rules.md` に従う。
- 一覧 API のレスポンスは `{ items: Card[] }`、単体 API のレスポンスは `Card` オブジェクト。
- `POST /api/cards/{cardId}/archive` および `POST /api/cards/{cardId}/restore` は body を要求しない (空 body 許容)。成功時は更新後の `Card` を返す。
- `POST /api/cards/{cardId}/restore` は復元前の `status` (`archived` / `deleted`) に応じてどちらの復元も行う。復元経路の分岐はサーバー側で自動判定する。
- `DELETE /api/cards/{cardId}` は成功時に 204 (body なし) を返す。
- `DELETE /api/cards/{cardId}/permanent` は成功時に 204 (body なし) を返す。

### 並び替え API リクエスト body の確定

`spec/003_cards.md § 未決事項` にあった body 表現を、本 spec で以下に確定する。

- `PATCH /api/cards/{cardId}/order` のリクエスト body は次のフィールドを含む。
  - `sourceListId` (文字列、必須): 移動元リスト ID。
  - `targetListId` (文字列、必須): 移動先リスト ID (同一ボード内)。
  - `targetOrder` (数値、必須): 移動先リスト内での挿入位置 (0 以上の整数)。
- `PATCH /api/lists/{listId}/order` のリクエスト body は次のフィールドを含む。
  - `targetOrder` (数値、必須): 移動先位置 (0 以上の整数)。

## 受入条件

- [ ] カードを同一リスト内でドラッグアンドドロップで並び替えると、`PATCH /api/cards/{cardId}/order` に `sourceListId` / `targetListId` (同値) / `targetOrder` が送られ、200 応答後に UI 上で位置が確定する。
- [ ] カードを別リストへドラッグアンドドロップで移動すると、`PATCH /api/cards/{cardId}/order` に `sourceListId` / 異なる `targetListId` / `targetOrder` が送られ、200 応答後に移動先リストの指定位置に配置される。
- [ ] リストをドラッグアンドドロップで並び替えると、`PATCH /api/lists/{listId}/order` に `targetOrder` が送られ、200 応答後に UI 上で位置が確定する。
- [ ] ドラッグアンドドロップ中の API 呼出が失敗すると、UI 上の並び順が操作前に戻る。
- [ ] `member` 以上のユーザーがカード詳細モーダルからアーカイブを実行すると、対象カードは既定の一覧から消え、アーカイブ一覧に表示される。
- [ ] アーカイブ一覧から復元を実行すると、対象カードは元リストの末尾に配置され、既定の一覧に戻る。
- [ ] `member` 以上のユーザーがカード詳細モーダルから削除を実行すると、対象カードは既定の一覧から消え、削除済み一覧に表示される。
- [ ] 削除済み一覧から復元を実行すると、対象カードは元リストの末尾に配置され、既定の一覧に戻る。
- [ ] `owner` が削除済み一覧またはアーカイブ一覧から完全削除を実行すると、対象カードは DB から物理削除され、いずれの一覧にも表示されない。
- [ ] `member` ロールのユーザーが `DELETE /api/cards/{cardId}/permanent` を呼ぶと `403` が返る。
- [ ] `viewer` ロールのユーザーがアーカイブ、復元、soft delete、完全削除、並び替えいずれの API を呼んでも `403` が返る。
- [ ] 未ログインユーザーが本 spec のいずれの API を呼んでも `401` が返る。
- [ ] 存在しない `cardId` を指定した本 spec のいずれの API を呼んでも `404` が返る。
- [ ] 移動先 `targetListId` が別ボードのリストである場合、`PATCH /api/cards/{cardId}/order` は `404` を返す。
- [ ] `targetOrder` が負数、または対象リスト内カード数を超える場合、`422` が返る。
- [ ] 既にアーカイブ済みのカードに対して再アーカイブ API を呼ぶと `422` が返る (`already_archived`)。
- [ ] 既に削除済みのカードに対して再 soft delete API を呼ぶと `422` が返る (`already_deleted`)。
- [ ] `active` 状態のカードに対して復元 API を呼ぶと `422` が返る (`not_restorable`)。
- [ ] アーカイブ、soft delete、復元、完全削除の各操作は操作ログに記録される。

## 異常系

`spec/000_shared_rules.md § HTTP ステータスコード` と `§ Route Handler の入口チェック順序` に従う。

### 認証、権限、存在チェック

| 状況 | ステータス | 補足 |
|---|---|---|
| 未ログインで本 spec の API 呼出 | `401` | 全 API 共通 |
| 存在しない `cardId` を指定 | `404` | アーカイブ / 復元 / soft delete / 完全削除 / 並び替え API |
| 存在しない `boardId` を指定 | `404` | archived / deleted 一覧 API |
| 存在しない `listId` を指定 | `404` | リスト並び替え API |
| 閲覧権限 (`viewer` 以上) のないボード配下のカード / リスト / ボード を指定 | `404` | 存在有無を漏らさないため `404` に統一 |
| `viewer` ロールがアーカイブ / 復元 / soft delete / 完全削除 / 並び替え API を呼ぶ | `403` | 認証済み、閲覧可の状態が前提 |
| `member` ロールが `DELETE /api/cards/{cardId}/permanent` を呼ぶ | `403` | 完全削除は owner のみ |
| カード並び替えで `targetListId` が別ボードに属する | `404` | 別ボードのリストは「アクセスできないリソース」 として `404` |

### バリデーションエラー / 状態遷移エラー

| 状況 | ステータス | フィールド | メッセージ例 |
|---|---|---|---|
| `sourceListId` / `targetListId` / `targetOrder` のいずれかが未指定 | `422` | 該当フィールド | `required` |
| `targetOrder` が数値でない、または負数 | `422` | `targetOrder` | `invalid_position` |
| `targetOrder` が対象リスト内カード数を超える (同一リスト内は自カードを除いた件数、別リストは移動先リストのカード数) | `422` | `targetOrder` | `out_of_range` |
| リスト並び替えで `targetOrder` が同一ボード内リスト数を超える | `422` | `targetOrder` | `out_of_range` |
| アーカイブ API を `status = archived` のカードに対して呼ぶ | `422` | (body 全体) | `already_archived` |
| アーカイブ API を `status = deleted` のカードに対して呼ぶ | `422` | (body 全体) | `already_deleted` |
| soft delete API を `status = deleted` のカードに対して呼ぶ | `422` | (body 全体) | `already_deleted` |
| 復元 API を `status = active` のカードに対して呼ぶ | `422` | (body 全体) | `not_restorable` |
| 復元時、元リスト (`listId`) が存在しない | `422` | `listId` | `restore_target_missing` |

### 画面レベル

- アーカイブ一覧、削除済み一覧の API が `403` を返した場合、「操作権限がありません」 相当の表示を行う。
- 完全削除の API が `403` を返した場合 (member が呼んだ等)、「この操作は owner のみ実行できます」 相当の表示を行う。
- 復元時に `restore_target_missing` が返った場合、「復元先リストが削除されています。別リストへ復元してください」 相当のメッセージを表示する (復元先リスト指定機能は本 spec の対象外、`§ 未決事項` 参照)。
- 並び替え途中に API が失敗した場合、UI 上の並び順を元の状態に戻す (ロールバック挙動)。

## 境界条件

### 並び替え共通

- `targetOrder = 0`: リスト先頭への移動として受け付ける。
- `targetOrder = 移動先リスト内カード数`: リスト末尾への移動として受け付ける (同一リスト内での並び替えの場合、自カードを除いた件数を上限とする)。
- 同一位置への移動 (`sourceListId = targetListId` かつ現在位置と `targetOrder` が同じ): 200 で成功、`updatedAt` は更新する (操作としては受理されたと見なす)。設計工程で「no-op として `updatedAt` を触らない」 に変更する余地があるが、初期方針は更新する。
- 空リスト (カード 0 件) への移動: `targetOrder = 0` のみ受け付ける。それ以外は `422` (`out_of_range`)。
- 移動先リストにカードが 1 件しかなく、その 1 件が対象カード自身 (同一リスト内での並び替え時): `targetOrder = 0` のみ受け付ける (自カードを除いた件数 = 0)。

### リスト並び替え

- 同一ボード内リストが 1 件のみの状態でリスト並び替え API を呼んだ場合、`targetOrder = 0` なら 200 で成功、それ以外は `422` (`out_of_range`)。

### アーカイブ、削除、復元の再操作

- 既にアーカイブ済みのカードへの再アーカイブ: `422` (`already_archived`)。
- 既に削除済みのカードへの再 soft delete: `422` (`already_deleted`)。
- 既に active のカードへの復元: `422` (`not_restorable`)。
- アーカイブ済みカードに対する soft delete: 遷移として許可、`status = deleted` へ更新。
- 削除済みカードに対する完全削除 (owner): 物理削除、204。
- アーカイブ済みカードに対する完全削除 (owner): 物理削除、204。
- active カードに対する完全削除 (owner): 物理削除、204 (経路としては削除済み一覧経由が推奨だが、API 呼出そのものは受理)。

### 状態一覧

- アーカイブ一覧 0 件: `GET /api/boards/{boardId}/archived-cards` は `{ items: [] }` を 200 で返す。
- 削除済み一覧 0 件: `GET /api/boards/{boardId}/deleted-cards` は `{ items: [] }` を 200 で返す。

## バリデーション

| フィールド | ルール |
|---|---|
| `sourceListId` (カード並び替え body) | 文字列、必須。存在しないと `404`。|
| `targetListId` (カード並び替え body) | 文字列、必須。同一ボード内のリストであること。別ボードまたは非存在なら `404`。|
| `targetOrder` (カード / リスト並び替え body) | 0 以上の整数。数値でない、負数、上限超過で `422`。上限は「移動先リスト内カード数」 (同一リスト内は自カードを除いた件数) または「同一ボード内リスト数」。|
| `cardId` (URL パラメータ) | 文字列。存在しないと `404`。|
| `listId` (URL パラメータ) | 文字列。存在しないと `404`。|
| `boardId` (URL パラメータ) | 文字列。存在しないと `404`。|

- アーカイブ / 復元 / soft delete / 完全削除の各 API は body を要求しない。body に想定外フィールドがある場合の扱いは設計工程で決める (初期方針: 未知フィールドは無視する)。

## 権限境界

`spec/000_shared_rules.md § 権限マトリクス` に従い、本 spec の追加操作を含めた表を再掲する。

| 操作 | 必要権限 | 権限不足時の挙動 |
|---|---|---|
| カード並び替え (`PATCH /api/cards/{cardId}/order`) | 対象ボードの `member` 以上 | 未ログイン `401`、`viewer` は `403`、閲覧不可 `404`、別ボードのリスト指定 `404` |
| リスト並び替え (`PATCH /api/lists/{listId}/order`) | 対象ボードの `member` 以上 | 未ログイン `401`、`viewer` は `403`、閲覧不可 `404` |
| カードアーカイブ (`POST /api/cards/{cardId}/archive`) | 対象ボードの `member` 以上 | 未ログイン `401`、`viewer` は `403`、閲覧不可 `404` |
| カード復元 (`POST /api/cards/{cardId}/restore`) | 対象ボードの `member` 以上 | 未ログイン `401`、`viewer` は `403`、閲覧不可 `404` |
| カード soft delete (`DELETE /api/cards/{cardId}`) | 対象ボードの `member` 以上 | 未ログイン `401`、`viewer` は `403`、閲覧不可 `404` |
| カード完全削除 (`DELETE /api/cards/{cardId}/permanent`) | 対象ボードの `owner` | 未ログイン `401`、`owner` 以外 `403`、閲覧不可 `404` |
| アーカイブ一覧取得 (`GET /api/boards/{boardId}/archived-cards`) | 対象ボードの `viewer` 以上 | 未ログイン `401`、閲覧不可 `404` |
| 削除済み一覧取得 (`GET /api/boards/{boardId}/deleted-cards`) | 対象ボードの `viewer` 以上 | 未ログイン `401`、閲覧不可 `404` |

## 非機能要件

`spec/000_shared_rules.md § 非機能要件` に従う。本 spec 固有の要件は次の通り。

### 性能

- 並び替え API (カード / リスト) は書き込み API として P95 300ms 以内。
- アーカイブ / 復元 / soft delete / 完全削除 API は書き込み API として P95 300ms 以内。
- アーカイブ一覧 / 削除済み一覧 API は一覧 API として P95 200ms 以内。

### 運用 (操作ログ)

- アーカイブ、復元、soft delete、完全削除、カード並び替え、リスト並び替えの各操作について、次の情報を操作ログに残す。
  - 操作種別 (`card_archive` / `card_restore` / `card_soft_delete` / `card_permanent_delete` / `card_reorder` / `list_reorder`)
  - 対象リソース識別子 (`cardId` または `listId`)
  - 対象ボード識別子 (`boardId`)
  - 操作ユーザー識別子 (`userId`)
  - 遷移前状態 / 遷移後状態 (アーカイブ / 復元 / soft delete / 完全削除の場合)
  - 移動前位置 / 移動後位置 / `sourceListId` / `targetListId` (並び替えの場合)
  - タイムスタンプ (ISO8601 UTC)
- ログの保存先と保存形式は設計工程で決める。

### 同時更新時の扱い

- 本 spec は「last-writer-wins」 を初期方針とする。楽観的ロック (`updatedAt` 比較や version フィールド) の導入は設計工程で判断する。
- 具体挙動:
  - 同一カードに対するアーカイブ / 復元 / soft delete が同時に発火した場合、DB 上の状態遷移が有効な操作 (状態遷移として正当) のみ成功し、遷移が不整合な操作は `422` を返す。
  - 同一カードに対する並び替えが同時に発火した場合、後着リクエストの `targetOrder` に基づく再計算が最終状態となる。中間状態の他カード `order` は再計算により整合が保たれる。
  - 同一リストに対するリスト並び替えの同時発火も同様に、後着リクエストが有効となる。
- 楽観的ロックを導入する場合の互換方針、および 409 (Conflict) の使用可否は設計工程で決める。

### セキュリティ

- `constitution.md § セキュリティ` に従い、本 spec は SQLite ローカル環境を前提とする。追加要件なし。

## 使用する用語

以下の用語は `constitution.md § 用語集` を参照する。

- ボード (Board)
- リスト (List)
- カード (Card)
- アーカイブ (Archive)
- 復元 (Restore)

本 spec 固有の未登録用語は無い (状態値 `active` / `archived` / `deleted` は用語集への追加候補として `§ 未決事項` に列挙)。

## 参照する既存ファイル

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`
- `spec/003_cards.md`
- `inputs/004_card_movement_archive_restore_spec_input.md`

## 未決事項

- 復元先リストが削除されている場合の代替復元先 (元ボードの先頭リスト自動選択 / ユーザー指定 UI) は本 spec の対象外。別 spec で扱う。
- アーカイブ / 削除時の元リスト他カード `order` の詰め直し方針 (詰めない / 詰める) は設計工程で決める。
- 状態値 `active` / `archived` / `deleted` を `constitution.md § 用語集` に追加するかは `/constitution` で判断する。
- 並び替え API の楽観的ロック導入と 409 (Conflict) の使用可否は設計工程で決める。
- カード並び替え API リクエスト body の同時 body 表現 (`beforeCardId` 経路 / `order` 直接指定経路) は本 spec で `sourceListId` / `targetListId` / `targetOrder` に確定させたため、他表現の採否は再検討時に扱う。
- ドラッグアンドドロップの実装ライブラリ選定は設計工程で決める (`spec/002_lists.md § 未決事項` と整合)。
- タッチデバイス対応 (モバイル / タブレット) の UX は `ui-design/` で決める。
- 完全削除操作の undo 導線 (「元に戻す」 機能) は本 spec の対象外。
- 定期的な自動完全削除 (削除済みカードを N 日後に物理削除する) は本 spec の対象外。
- アーカイブ一覧 / 削除済み一覧のページネーションは本 spec の対象外 (初期実装は全件返却、`spec/000_shared_rules.md § 一覧 API のレスポンス構造` と整合)。
- リスト自体のアーカイブ / 削除復元は本 spec の対象外。カード単位のみを扱う。
