# カード移動・アーカイブ・削除と復元の仕様

## 概要

カードの並べ替え（同一リスト内 / 別リストへの移動）、リストの並べ替え、ドラッグ&ドロップ操作、カードのアーカイブ／アーカイブ復元、カードのソフト削除／削除復元／完全削除を定義する。
既存のボード・リスト・カードの基本操作（作成・表示・編集）を前提とし、それを壊さずに機能を追加する。

## 既存仕様との関係

- 共通規約は `spec/000_shared_rules.md` を参照する。
- カードは `spec/003_cards.md`、リストは `spec/002_lists.md` の定義を継承する。
- 本仕様は Card に状態フィールド（`archivedAt` / `deletedAt`）を新規追加する。これに伴い `spec/003_cards.md` を本サイクルで更新し、以下2点を一本化する（spec/004 を正とする）。
  - **削除の意味**: `DELETE /api/cards/[cardId]` を**ソフト削除（`deletedAt` 設定・復元可能・member 以上）に再定義**。物理削除は owner 専用の `DELETE /api/cards/[cardId]/purge` に分離する。
  - **一覧の既定フィルタ**: `GET /api/lists/[listId]/cards` は既定で**アクティブなカードのみ**（`archivedAt` が null かつ `deletedAt` が null）を返す。アーカイブ済み・削除済みは `?status` クエリで取得する。
- リスト削除は `spec/002_lists.md` のとおり配下カードを**状態問わず物理 cascade 削除**する（active / archived / deleted すべて。§ 状態遷移とリスト削除 参照）。

## 対象データ

- Card（`spec/003_cards.md` の Card に以下を追加）
  - `archivedAt`: datetime | null（アーカイブ時刻。null はアーカイブされていない）
  - `deletedAt`: datetime | null（ソフト削除時刻。null は削除されていない）
- **状態は排他**: `archivedAt` と `deletedAt` が同時に非 null になることはない。カードは次の3状態のいずれか1つを取る。
  - active: `archivedAt == null` かつ `deletedAt == null`
  - archived: `archivedAt != null` かつ `deletedAt == null`
  - deleted: `deletedAt != null` かつ `archivedAt == null`
- `order` は同一 `listId` 内の**アクティブなカード**について 0 始まりの連番で連続させる（後述「並び順の規則」）。
- List / Board は変更なし。

## 並び順の規則（本仕様で確定）

- リスト内のアクティブなカードの `order` は、移動系操作のたびに 0 始まりで連続（0,1,2,…）に**サーバー側で再計算**する。
- ボード内のリストの `order` も、リスト移動のたびに 0 始まりで連続に再計算する。
- `targetOrder` は「挿入先インデックス（0 始まり）」を意味する。
- アーカイブ／ソフト削除されたカードはアクティブ集合から外れ、残りのカードの `order` を 0 始まりに詰め直す。
- アーカイブ復元／削除復元したカードは、元リストの**アクティブ集合の末尾**にアクティブとして戻す（`order` = 復元先リストのアクティブ件数。元の位置は保持しない）。
- 復元先の List は常に存在する（カードが存在する間、その `listId` の List も存在する。リスト削除はカードを物理 cascade 削除するため、List なしのカードは発生しない）。

## 状態遷移とリスト削除

- 状態遷移（排他）
  - active → archive（POST archive）→ archived
  - archived → unarchive（POST unarchive）→ active
  - active → soft delete（DELETE）→ deleted
  - deleted → restore（POST restore）→ active
  - deleted → purge（DELETE purge, owner）→ 物理削除（復元不可）
  - archived 状態のカードへの soft delete は 422（先に unarchive が必要）。deleted 状態のカードへの archive は 422（先に restore が必要）。
- リスト削除: `spec/002_lists.md` のリスト削除は配下カードを状態問わず物理 cascade 削除する。リスト削除後、そのカードは active/archived/deleted いずれであっても復元できない。

## 機能要件

### 操作: カードの並べ替え（同一リスト内）

- `cardId`（active）のカードを同じリスト内で `targetOrder` の位置へ移動し、リスト内のアクティブなカードの `order` を再計算する。

### 操作: カードの移動（別リストへ）

- `cardId`（active）のカードを `sourceListId` から `targetListId` の `targetOrder` の位置へ移動する。
- `targetListId` は対象カードの現在のボード（`sourceList.boardId`）と**同一ボードに属すること**。別ボードのリストは 422。
- 移動元・移動先の両リストのアクティブなカードの `order` を再計算し、カードの `listId` を `targetListId` に更新する。

### 操作: リストの並べ替え

- `listId` のリストを同一ボード内で `targetOrder` の位置へ移動し、ボード内のリストの `order` を再計算する。

### 操作: カードのアーカイブ

- `cardId`（active）のカードの `archivedAt` に現在時刻を設定し、リストのアクティブ集合から外して残りの `order` を詰め直す。
- すでにアーカイブ済みのカードへの再アーカイブは冪等（`archivedAt` の値も変更せず成功）。
- deleted 状態のカードへの archive は 422。

### 操作: カードのアーカイブ復元

- `cardId`（archived）のカードの `archivedAt` を null に戻し、元リストのアクティブ集合の末尾に戻す。
- すでに未アーカイブ（active）のカードへの unarchive は冪等（状態を変えず成功）。

### 操作: カードのソフト削除

- `cardId`（active）のカードの `deletedAt` に現在時刻を設定し（ゴミ箱へ）、リストのアクティブ集合から外して残りの `order` を詰め直す。
- すでに削除済みのカードへの再削除は冪等（`deletedAt` の値も変更せず成功）。
- archived 状態のカードへの soft delete は 422。

### 操作: カードの削除復元

- `cardId`（deleted）のカードの `deletedAt` を null に戻し、元リストのアクティブ集合の末尾に戻す。
- すでに未削除（active）のカードへの restore は冪等（状態を変えず成功）。

### 操作: カードの完全削除（purge）

- `cardId`（deleted）のカードを物理削除する（復元不可）。owner のみ実行できる。
- deleted 状態でない（active / archived）カードへの purge は 422。

## 画面

- `/boards/[id]`（ボード詳細画面）
  - **ドラッグ&ドロップ**: カードをドラッグして同一リスト内で並べ替え、または同一ボード内の別リストへ移動できる。リスト列をドラッグして並べ替えできる。
    - ドロップ確定時に、対象の移動 API を `targetListId` / `targetOrder`（カード）または `targetOrder`（リスト）付きで呼ぶ。
    - D&D の並べ替え結果は API 受入条件（move / list move）で検証する。UI 層は当該 API 呼び出しの発火をもって満たすとみなす。
    - 既定表示はアクティブなカードのみ。アーカイブ済み・削除済みは表示しない。
  - **アーカイブ操作**: カード詳細モーダルから「アーカイブ」を実行できる。
  - **削除操作**: カード詳細モーダルから「削除（ゴミ箱へ）」を実行できる。
  - **アーカイブ／削除の一覧と復元**: アーカイブ済み・削除済みカードを一覧表示し、そこから「復元」を実行できる（表示切替またはパネル）。完全削除は owner のみ実行できる。
- ドラッグ&ドロップのライブラリ選定・アクセシビリティ実装方針は `/design` および UI 設計で確定する（本仕様では操作結果の受入条件のみ定義）。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/lists/[listId]/cards?status=active\|archived\|deleted | カード一覧取得（既定 active） | viewer 以上 |
| POST | /api/cards/[cardId]/move | カード移動（同一/別リスト・並べ替え） | member 以上 |
| POST | /api/lists/[listId]/move | リスト並べ替え | member 以上 |
| POST | /api/cards/[cardId]/archive | カードのアーカイブ | member 以上 |
| POST | /api/cards/[cardId]/unarchive | カードのアーカイブ復元 | member 以上 |
| DELETE | /api/cards/[cardId] | カードのソフト削除（spec/003 で一本化） | member 以上 |
| POST | /api/cards/[cardId]/restore | カードの削除復元 | member 以上 |
| DELETE | /api/cards/[cardId]/purge | カードの完全削除（deleted 状態のみ） | owner |

- `POST /api/cards/[cardId]/move` の body: `{ "sourceListId": string, "targetListId": string, "targetOrder": number }`
- `POST /api/lists/[listId]/move` の body: `{ "targetOrder": number }`
- アーカイブ／復元／削除／復元系のリクエストボディは不要（パスの id のみ）。
- `status` に未定義値を渡した場合は 422 / VALIDATION_ERROR。

## 受入条件

- [ ] POST /api/cards/[cardId]/move で同一リスト内 `targetOrder` を指定すると 200 を返し、リスト内の `order` が 0 始まりの連番に再計算される
- [ ] POST /api/cards/[cardId]/move で同一ボード内の別リストへ移動すると 200 を返し、カードの `listId` が `targetListId` に変わり、移動元・移動先の `order` が両方 0 始まりに再計算される
- [ ] move で `targetListId` が対象カードのボードと異なるボードのリストの場合は 422 / VALIDATION_ERROR を返す
- [ ] 空リストへの移動（`targetOrder=0`）は 200 で成功し、移動先の `order` は 0 になる
- [ ] リスト先頭への移動（`targetOrder=0`）は 200 で成功し、対象カードの `order` が 0 になる
- [ ] リスト末尾への移動（`targetOrder`=移動先アクティブ件数）は 200 で成功する
- [ ] 同じ位置への移動（現在と同じ `targetOrder`）は 200 で成功し、並び順は変化しない
- [ ] move で `sourceListId` が対象カードの現在の `listId` と一致しない場合は 422 / VALIDATION_ERROR を返す
- [ ] move で `targetOrder` が 0 未満または挿入可能範囲を超える場合は 422 / VALIDATION_ERROR を返す
- [ ] move で対象カードが archived / deleted の場合は 422 / VALIDATION_ERROR を返す
- [ ] move で存在しない `cardId` / `targetListId` を指定すると 404 / NOT_FOUND を返す
- [ ] POST /api/lists/[listId]/move で `targetOrder` を指定すると 200 を返し、ボード内リストの `order` が 0 始まりに再計算される
- [ ] list move で `targetOrder` が 0 未満またはボード内リスト数を超える場合は 422 / VALIDATION_ERROR を返す
- [ ] POST /api/cards/[cardId]/archive は 200 を返し、対象の `archivedAt` が設定され、GET（既定 active）の一覧から外れる
- [ ] すでにアーカイブ済みのカードへの archive は 200 を返し、`archivedAt` の値を含め状態は変化しない（冪等）
- [ ] deleted 状態のカードへの archive は 422 / VALIDATION_ERROR を返す
- [ ] POST /api/cards/[cardId]/unarchive は 200 を返し、`archivedAt` が null になり、対象の `order` が復元先リストのアクティブ件数（末尾 index）になる
- [ ] DELETE /api/cards/[cardId] は 200 を返し、対象の `deletedAt` が設定され、GET（既定 active）の一覧から外れる（物理削除はされない）
- [ ] すでに削除済みのカードへの DELETE は 200 を返し、`deletedAt` の値を含め状態は変化しない（冪等）
- [ ] archived 状態のカードへの DELETE は 422 / VALIDATION_ERROR を返す
- [ ] POST /api/cards/[cardId]/restore は 200 を返し、`deletedAt` が null になり、対象の `order` が復元先リストのアクティブ件数（末尾 index）になる
- [ ] GET /api/lists/[listId]/cards?status=archived はアーカイブ済みカードのみを返す
- [ ] GET /api/lists/[listId]/cards?status=deleted は削除済みカードのみを返す
- [ ] GET /api/lists/[listId]/cards?status=<未定義値> は 422 / VALIDATION_ERROR を返す
- [ ] DELETE /api/cards/[cardId]/purge は owner が deleted 状態のカードに実行すると 200 を返し、カードが物理削除される
- [ ] deleted 状態でない（active/archived）カードへの purge は 422 / VALIDATION_ERROR を返す
- [ ] DELETE /api/cards/[cardId]/purge を member/viewer が実行すると 403 / FORBIDDEN を返す
- [ ] 未認証で上記いずれの操作を行うと 401 / UNAUTHORIZED を返す

## 異常系

- 存在しない `cardId` / `listId` / `targetListId` は 404 / NOT_FOUND。
- `sourceListId` が対象カードの現在の `listId` と不一致は 422 / VALIDATION_ERROR。
- `targetListId` が対象カードのボードと異なるボードは 422 / VALIDATION_ERROR。
- `targetOrder` が整数でない、0 未満、挿入可能範囲超過は 422 / VALIDATION_ERROR。
- move の対象カードが archived / deleted（非アクティブ）の場合は 422 / VALIDATION_ERROR（先に復元/アーカイブ復元が必要）。
- archived への soft delete、deleted への archive は 422 / VALIDATION_ERROR。
- purge を deleted 状態以外に行うと 422 / VALIDATION_ERROR。owner 以外が行うと 403 / FORBIDDEN。
- `status` に未定義値は 422 / VALIDATION_ERROR。
- 未認証は 401 / UNAUTHORIZED。
- 権限不足（member 未満での move/archive/restore 等）は 403 / FORBIDDEN（閲覧権限もない場合は 404）。

## 境界条件

- 空リストへの移動: `targetOrder=0` のみ有効。
- リスト先頭への移動: `targetOrder=0`。
- リスト末尾への移動: `targetOrder`=移動先リストのアクティブ件数（同一リスト内移動では対象カードを除いた件数）。
- 同じ位置への移動: 現在の `order` と同じ `targetOrder` → 成功・変化なし。
- すでにアーカイブ済みカードへの再アーカイブ / すでに削除済みカードへの再削除 / 未アーカイブへの unarchive / 未削除への restore: いずれも冪等成功（200・タイムスタンプも不変）。
- `targetOrder` = 挿入可能上限ちょうど: 許可（末尾追加）。
- `targetOrder` = 挿入可能上限 + 1: 422。

## バリデーション

- `sourceListId` / `targetListId` / `listId`: 必須、文字列。対応リソースが存在しなければ 404。
- `sourceListId`: 対象カードの現在の `listId` と一致すること。不一致は 422。
- `targetListId`: 対象カードのボードと同一ボードに属すること。不一致は 422。
- `targetOrder`: 必須、0 以上の整数。範囲外・型不正は 422。
- move の対象カードは active であること。archived / deleted は 422。
- archive は active（または archived の冪等）に対してのみ成功。deleted への archive は 422。
- soft delete は active（または deleted の冪等）に対してのみ成功。archived への delete は 422。
- purge は deleted 状態のカードにのみ成功。それ以外は 422。
- `status`: `active` / `archived` / `deleted` のいずれか。未定義値は 422。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| カード一覧取得（active/archived/deleted） | viewer 以上 | 権限なしは 404、未認証は 401、status 不正は 422 |
| カード移動 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404、状態/範囲/ボード不一致は 422 |
| リスト並べ替え | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404、範囲不正は 422 |
| カードのアーカイブ／アーカイブ復元 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404、状態不正は 422 |
| カードのソフト削除／削除復元 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404、状態不正は 422 |
| カードの完全削除（purge） | owner | 権限不足は 403、未認証は 401、存在なしは 404、状態不正は 422 |

## 非機能要件

- 並び順更新（move / list move）の書き込み API の P95 は 300ms 以内（constitution.md § 性能）。
- カード一覧取得の P95 は 200ms 以内（constitution.md § 性能）。
- アーカイブ・削除・復元・完全削除・移動は操作ログに残す。リクエスト ID を付与する（spec/000_shared_rules.md § ログ方針）。
- **同時更新時の扱い**: 並び順はサーバー側で「現在の DB 状態から 0 始まり連番を再計算」する方式とし、移動系操作は 1 トランザクション内で対象リストのアクティブカードを読み取り→再採番→書き込みする。これにより同時移動は直列化され、クライアントが送った古い `order` があってもサーバー再計算で整合する（last-write-wins）。楽観ロック用のバージョン列は本仕様では設けない（判断は未決事項参照）。

## 使用する用語

- カード（Card）（constitution.md § 用語集 参照）
- リスト（List）（constitution.md § 用語集 参照）
- アーカイブ（Archive）（constitution.md § 用語集 参照）
- 復元（Restore）（constitution.md § 用語集 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/001_boards.md
- spec/002_lists.md
- spec/003_cards.md
- inputs/004_card_movement_archive_restore_spec_input.md

## 未決事項

- 同時更新の競合検知を厳密化する場合の楽観ロック（`version` 列や `updatedAt` 条件付き更新）の導入要否。現状は「サーバー再計算 + トランザクション + last-write-wins」で十分とし、将来要件が出た場合に再検討する。
- アーカイブ済み・削除済みカードの保持期間・自動 purge の有無（現状は無期限保持・手動 purge のみ）。
