# 認証機能の仕様

## 概要

本 file は認証機構 (User の登録、ログイン、ログアウト、セッション維持、リフレッシュ) の仕様を定義する。
共通ルールは `spec/000_shared_rules.md`、権限ポリシーは `constitution.md § 権限ポリシー` を参照する。
`spec/000_shared_rules.md § 認証の前提` では「認証機構は既に存在する」 という前提のもと Board / List / Card 系の仕様を書いていたが、本 spec がその認証機構本体の SSOT を提供する。

## 既存仕様との関係

- `spec/000_shared_rules.md § 認証の前提` の「認証機構そのもの (ログイン画面、セッション管理、ユーザー登録) は別 spec で扱う」 を本 spec が引き受ける。
- 本 spec が導入する認証機構の抽象は「Route Handler で現在ユーザーを取得できる」 経路 (`getCurrentUser(request)`) を維持する。既存 Board / List / Card / Comment / Assignee 仕様の Route Handler 入口 (`requireCurrentUser`) は変更しない。
- 開発検証用の X-User-Id header は本 spec で廃止し、Cookie ベースのセッションに置き換える。既存 API の入口チェック順序 (`spec/000_shared_rules.md § Route Handler の入口チェック順序`) は変更しない。

## 対象データ

### User エンティティ (拡張)

既存の `User` に認証用フィールドを追加する。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | 文字列 | ユーザーを一意に識別する ID (既存) |
| `email` | 文字列 | メールアドレス。一意 |
| `passwordHash` | 文字列 | パスワードのハッシュ値 |
| `name` | 文字列 | 表示名 (既存、1〜100 文字) |
| `createdAt` | ISO8601 UTC | 作成日時 (既存) |
| `updatedAt` | ISO8601 UTC | 更新日時 (既存) |

- `email` は全ユーザーで一意 (`unique`)。大文字小文字を区別せず一意判定する (登録時に小文字化して保存)。
- `passwordHash` は生パスワードを DB に保存しない。ハッシュ方式の詳細は `design/011_auth.md` で決める。
- API レスポンスで `passwordHash` を返さない (`§ 非機能要件 § セキュリティ`)。

### Session エンティティ (新設)

ログイン中ユーザーのセッションを保持する。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | 文字列 | セッションを一意に識別する ID (Cookie の値と一致) |
| `userId` | 文字列 | セッション所有者の User ID |
| `expiresAt` | ISO8601 UTC | セッションの絶対有効期限 |
| `createdAt` | ISO8601 UTC | セッション作成日時 |

- Session は Cookie の値 (`sid`) で参照する。Cookie 属性の詳細は `design/011_auth.md` で決める。
- `expiresAt` を過ぎたセッションは無効化する。
- 1 ユーザーあたり複数セッションを許容する (別端末 / 別ブラウザからのログイン)。
- ログアウトで対象セッションのみ物理削除する。

## 機能要件

### FR-01: サインアップ (新規ユーザー登録)

- 未ログインユーザーがサインアップ画面 (`/signup`) から実行する。
- 入力項目は `email` / `password` / `name` の 3 項目。
- 登録後、自動的にログイン状態となる (新規セッションを発行し Cookie に設定する)。
- 登録直後はどのボードにも所属しない状態で始まる (ボードは自分で作成、またはメンバー招待経由で参加する)。
- サインアップは常に成功するとは限らない (`email` 重複、バリデーション失敗)。

観測可能な完了条件

- [ ] `POST /api/auth/signup` に有効な `email` / `password` / `name` を送ると `201` と `{ user: { id, email, name } }` が返り、レスポンスに `Set-Cookie: sid=<sessionId>` が含まれる。
- [ ] 登録された User は `email` が小文字化された状態で DB に保存され、`passwordHash` が生パスワードと異なる。
- [ ] 同じ `email` (大文字小文字違いを含む) で 2 度目の登録を試みると `409` (`already_registered`) が返る。

### FR-02: ログイン

- 未ログインユーザーがログイン画面 (`/login`) から実行する。
- 入力項目は `email` / `password` の 2 項目。
- 認証成功時、新規セッションを発行し Cookie に設定する。
- 認証失敗時は具体的な失敗理由 (「メールアドレスが存在しない」 vs 「パスワードが違う」) を返さない (`§ 非機能要件 § セキュリティ`)。

観測可能な完了条件

- [ ] `POST /api/auth/login` に登録済みユーザーの `email` / `password` を送ると `200` と `{ user: { id, email, name } }` が返り、レスポンスに `Set-Cookie: sid=<sessionId>` が含まれる。
- [ ] 認証失敗 (`email` 未登録 / パスワード不一致) はいずれも同じ `401` (`invalid_credentials`) を返す。

### FR-03: ログアウト

- ログイン中ユーザーが実行する。
- 対象セッション (現在の Cookie 値に対応する Session) を物理削除する。
- Cookie の失効を Set-Cookie で通知する (`Max-Age=0`)。

観測可能な完了条件

- [ ] `POST /api/auth/logout` にログイン中ユーザーの Cookie 付きで呼ぶと `204` が返り、レスポンスに `Set-Cookie: sid=; Max-Age=0` が含まれる。
- [ ] ログアウト後、同じ Cookie 値で認証が必要な API を呼ぶと `401` が返る。
- [ ] 未ログイン状態でログアウト API を呼んでも `204` を返す (冪等性を保つ)。

### FR-04: 現在ユーザー取得

- ログイン中ユーザーが自身の情報を確認する。
- 認証チェックのみを行い、DB の User レコードから最新値を返す。

観測可能な完了条件

- [ ] `GET /api/auth/me` にログイン中ユーザーの Cookie 付きで呼ぶと `200` と `{ user: { id, email, name } }` が返る。
- [ ] 未ログインで呼ぶと `401` (`unauthorized`) を返す。

### FR-05: セッション延長 (リフレッシュ)

- ログイン中ユーザーが実行する。
- 現在の Session を破棄し、新しい Session を発行して Cookie を差し替える。
- 既存の `userId` は保持し、`expiresAt` を新規発行時点から再計算する。

観測可能な完了条件

- [ ] `POST /api/auth/refresh` にログイン中ユーザーの Cookie 付きで呼ぶと `200` と `{ user: { id, email, name } }` が返り、レスポンスに新しい `Set-Cookie: sid=<新 sessionId>` が含まれる。
- [ ] リフレッシュ後、旧 Cookie 値では認証が通らず `401` が返る。
- [ ] 未ログインで呼ぶと `401` を返す。

### FR-06: 未認証時の 401 応答

- 認証を要する全 API (本 spec 外の Board / List / Card / Comment / Assignee 系含む) は、Cookie が無効 / 未指定 / 期限切れの場合、レスポンス body なしで `401 { "error": "unauthorized" }` を返す。
- 未認証応答に「なぜ 401 なのか」 の細分化 (期限切れ vs 未指定 vs 改ざん) は含めない (`§ 非機能要件 § セキュリティ`)。

観測可能な完了条件

- [ ] Cookie 未指定で認証を要する API を呼ぶと `401` が返る。
- [ ] 期限切れの Cookie で認証を要する API を呼ぶと `401` が返り、レスポンス body は `{ "error": "unauthorized" }` のみ (追加フィールドなし)。
- [ ] 存在しない sessionId の Cookie を送っても `401` が返る。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| `POST` | `/api/auth/signup` | 新規ユーザー登録 + 自動ログイン | 認証不要 |
| `POST` | `/api/auth/login` | ログイン | 認証不要 |
| `POST` | `/api/auth/logout` | ログアウト (冪等) | 認証不要 (未ログインでも `204`) |
| `GET` | `/api/auth/me` | 現在ユーザー取得 | ログイン済み |
| `POST` | `/api/auth/refresh` | セッション延長 | ログイン済み |

- レスポンス形式と認証チェック順序は `spec/000_shared_rules.md` に従う。
- `POST /api/auth/signup` のリクエスト body は `{ "email": <文字列>, "password": <文字列>, "name": <文字列> }`。
- `POST /api/auth/login` のリクエスト body は `{ "email": <文字列>, "password": <文字列> }`。
- `POST /api/auth/logout` / `GET /api/auth/me` / `POST /api/auth/refresh` はリクエスト body なし (Cookie のみで判定)。
- 成功時のレスポンス body から `passwordHash` を除外する (`§ 非機能要件 § セキュリティ`)。

## 受入条件

FR ごとの完了条件は `§ 機能要件` の各 FR に記載する。以下は FR を横断する統合条件。

- [ ] `POST /api/auth/signup` に `email` = 未登録メール、`password` = 8 文字以上英数字記号を含む値、`name` = 1〜100 文字を送ると `201` と `{ user: { id, email, name } }` が返る。
- [ ] `POST /api/auth/signup` の直後、レスポンス Cookie で認証を要する API (`GET /api/auth/me`) を呼ぶと `200` が返る。
- [ ] `POST /api/auth/signup` に `email` 重複 (大文字小文字違いを含む) を送ると `409` (`already_registered`) が返る。
- [ ] `POST /api/auth/signup` に `password` = 7 文字を送ると `422` (`password`, `too_short`) が返る。
- [ ] `POST /api/auth/signup` に `password` = 英字のみ / 数字のみ / 記号なし を送ると `422` (`password`, `weak`) が返る。
- [ ] `POST /api/auth/signup` に `email` = メール形式でない値を送ると `422` (`email`, `invalid_format`) が返る。
- [ ] `POST /api/auth/login` に登録済みユーザーの正しい `email` / `password` を送ると `200` と Cookie が返る。
- [ ] `POST /api/auth/login` に登録済みの `email` + 誤った `password` を送ると `401` (`invalid_credentials`) が返る。
- [ ] `POST /api/auth/login` に未登録の `email` を送ると `401` (`invalid_credentials`) が返る (`404` にはしない。存在露出防止)。
- [ ] `POST /api/auth/logout` は Cookie 有り無しに関わらず `204` を返し、Cookie を失効させる `Set-Cookie` を含む。
- [ ] `GET /api/auth/me` はログイン中に呼ぶと `200`、未ログインで呼ぶと `401` を返す。
- [ ] `POST /api/auth/refresh` の後、旧 Cookie では `401`、新 Cookie では `200` が返る。
- [ ] サインアップ / ログイン / ログアウト / リフレッシュに成功すると、操作ログに `event` / `actorId` / `sessionId` が記録される。
- [ ] 認証失敗 (`invalid_credentials`) の操作ログに `email` は記録しない (存在露出防止、`§ 非機能要件 § セキュリティ`)。

## 異常系

`spec/000_shared_rules.md § HTTP ステータスコード` の 4 種 (401 / 403 / 404 / 422) に加え、本 spec では以下の追加ステータスコードを用いる。

| 追加ステータス | 用途 | レスポンス body |
|---|---|---|
| `409 Conflict` | `email` 重複 | `{ "error": "conflict", "fields": { "email": "already_registered" } }` |

### 認証、権限、存在チェック

| 状況 | ステータス | 補足 |
|---|---|---|
| 未ログインで認証必須 API (`/api/auth/me` / `/api/auth/refresh`) を呼ぶ | `401` | body = `{ "error": "unauthorized" }` |
| 期限切れ Cookie で認証必須 API を呼ぶ | `401` | 期限切れ判定は Session の `expiresAt` |
| 存在しない sessionId の Cookie を送る | `401` | 具体理由を返さない |
| ログイン API に登録済み `email` + 誤 `password` | `401` | body = `{ "error": "invalid_credentials" }` |
| ログイン API に未登録 `email` | `401` | body = `{ "error": "invalid_credentials" }` (`404` にしない) |
| サインアップ API に重複 `email` (大文字小文字違い含む) | `409` | body = `{ "error": "conflict", "fields": { "email": "already_registered" } }` |

### バリデーションエラー

| 状況 | ステータス | フィールド | メッセージ例 |
|---|---|---|---|
| `email` 未指定または空文字 | `422` | `email` | `required` |
| `email` が文字列型でない | `422` | `email` | `invalid_type` |
| `email` がメール形式でない | `422` | `email` | `invalid_format` |
| `password` 未指定または空文字 | `422` | `password` | `required` |
| `password` が文字列型でない | `422` | `password` | `invalid_type` |
| `password` が 8 文字未満 | `422` | `password` | `too_short` |
| `password` が英字 / 数字 / 記号のうちいずれかを含まない | `422` | `password` | `weak` |
| `name` 未指定または空文字 (トリム後 0 文字) | `422` | `name` | `required` |
| `name` が文字列型でない | `422` | `name` | `invalid_type` |
| `name` が 101 文字以上 | `422` | `name` | `too_long` |

### 画面レベル

- サインアップ / ログイン画面で API が `422` を返した場合、フィールド別エラーメッセージをフォーム直下に表示する。
- ログイン画面で `401` (`invalid_credentials`) を返した場合、「メールアドレスまたはパスワードが正しくありません」 相当の統一メッセージを表示する。フィールドを特定しない。
- サインアップ画面で `409` を返した場合、「このメールアドレスは既に登録されています」 相当のメッセージを表示する。
- 認証を要する画面で `401` を検出した場合、`/login` へリダイレクトする (UI 詳細は `ui-design/`)。

## 境界条件

### `email` の形式

- 有効な例 = `user@example.com` / `USER@EXAMPLE.COM` (小文字化して保存)。
- 無効な例 = `user` (`@` なし) / `user@` (ドメインなし) / `@example.com` (ローカル部なし) / 空白のみ。
- 大文字小文字違いは重複扱い (`user@example.com` と `USER@example.com` は同じ ID とみなす)。

### `password` の強度

- 8 文字未満: `422 too_short`。
- 8 文字ちょうど (下限): 受け付ける (英字 + 数字 + 記号を含む場合)。
- 英字のみ / 数字のみ / 記号なし: `422 weak`。
- 英字 + 数字 + 記号のいずれかを 1 文字以上含む場合: 受け付ける。
- 上限は本 spec 対象外 (bcrypt の 72 byte 制限を考慮、`design/011_auth.md` で決める)。

### `name` の長さ

- 1 文字 (下限): 受け付ける。
- 100 文字 (上限): 受け付ける。
- 101 文字: `422 too_long`。
- トリム後 0 文字 (空白のみ): `422 required`。

### Session の有効期限

- 有効期限内: 認証 API は `200` を返す。
- 有効期限切れ直後: 認証 API は `401` を返す。
- 有効期限の長さは `design/011_auth.md` で決める (本 spec の初期方針は 7 日間)。

### 存在しないリソース

- 存在しない sessionId の Cookie: `401` を返す (`404` にしない、存在露出防止)。
- 存在しない `email` でログイン: `401 invalid_credentials` を返す (`404` にしない、存在露出防止)。

## バリデーション

| フィールド | ルール |
|---|---|
| `email` (`POST` body) | 文字列 (`invalid_type` 判定を先に行う)。空文字は `required`。RFC 5322 準拠は求めず「1 個以上の `@` を含み、`@` の前後にそれぞれ 1 文字以上ある」 の簡易チェック。詳細は `design/011_auth.md`。 |
| `password` (`POST` body) | 文字列 (`invalid_type` 判定を先に行う)。空文字は `required`。8 文字以上 (`too_short`)。英字 (a-zA-Z) / 数字 (0-9) / 記号 (`!-/:-@[-`{-~` の ASCII 印字可能記号) のうち 3 種を全て含む (`weak`)。|
| `name` (`POST` body、サインアップのみ) | 文字列 (`invalid_type` 判定を先に行う)。トリム後 1〜100 文字。トリム後 0 文字は `required`、101 文字以上は `too_long`。 |

- `POST /api/auth/signup` / `POST /api/auth/login` では `id` / `passwordHash` / `createdAt` / `updatedAt` はクライアントから受け取らない。
- `POST /api/auth/logout` / `GET /api/auth/me` / `POST /api/auth/refresh` は body を受け付けない (Cookie のみで判定)。

## 権限境界

`constitution.md § 権限ポリシー` は「ボード内のロール (owner / member / viewer)」 の話であり、本 spec の認証機構自体は「ログイン済み or 未ログイン」 の 2 択のみを扱う。ロールはボード単位で `BoardMembership` に保持される (`design/001_boards.md`)。

| 操作 | 必要権限 | 権限不足時の挙動 |
|---|---|---|
| サインアップ (`POST /api/auth/signup`) | 認証不要 | 認証済みユーザーが呼んでも受理する (別ユーザーの新規作成) |
| ログイン (`POST /api/auth/login`) | 認証不要 | 認証済みでも受理し、新セッションを発行する |
| ログアウト (`POST /api/auth/logout`) | 認証不要 (冪等) | 未ログインでも `204` を返す |
| 現在ユーザー取得 (`GET /api/auth/me`) | ログイン済み | 未ログインは `401` |
| セッション延長 (`POST /api/auth/refresh`) | ログイン済み | 未ログインは `401` |

- 本 spec は「ボードに所属しないユーザー」 の存在を明示的に許容する (サインアップ直後は 0 ボード)。
- 本 spec は「管理者ユーザー / 権限昇格 API」 を対象外とする。

## 非機能要件

`spec/000_shared_rules.md § 非機能要件` に従う。本 spec 固有の要件は次の通り。

### 性能

- サインアップ / ログイン API は書き込み API として P95 300ms 以内 (パスワードハッシュ計算コストは cost=10〜12 程度で目安 100ms 前後)。
- 現在ユーザー取得 API は一覧 API と同等に P95 200ms 以内。

### セキュリティ

- パスワードは必ずハッシュ化して DB に保存する (`passwordHash`)。生パスワードを DB / ログに残さない。
- パスワードハッシュのアルゴリズムは適応型 (`bcrypt` / `scrypt` / `argon2` 等) を採用する。詳細は `design/011_auth.md`。
- 認証失敗時に「メールアドレスが存在しない」 / 「パスワードが違う」 を区別しない (`invalid_credentials` の統一メッセージで返す)。
- 認証失敗ログには `email` を残さない (`actorId` は `null`、`context` から `email` を除外)。
- Cookie は HttpOnly 属性を必須とし、JavaScript から読めない。SameSite / Secure 属性の詳細は `design/011_auth.md`。
- サインアップ / ログイン API のレスポンス body に `passwordHash` を含めない。
- パスワードリセット / メール認証機能は本 spec の対象外 (`§ 未決事項`)。
- レート制限 (連続ログイン失敗のブロック) は本 spec の対象外 (`§ 未決事項`)。

### 運用 (操作ログ)

- サインアップ / ログイン / ログアウト / リフレッシュの各操作について、操作種別 (`auth.signup` / `auth.login` / `auth.logout` / `auth.refresh`)、操作ユーザー識別子 (成功時のみ)、`sessionId` (発行 / 失効時)、`status`、タイムスタンプを操作ログに残す。
- 認証失敗 (`invalid_credentials`) のログには `email` を残さない。`actorId` は `null`、`errorCode` = `invalid_credentials`。
- サインアップ重複 (`409 already_registered`) のログには `email` を残さない (存在露出防止)。`errorCode` = `conflict`。
- Cookie の値そのもの (`sid`) をログに残さない。ログに残すのは `sessionId` の頭 8 文字までのプレフィックス、または `sessionId` を hash 化した値 (`design/011_auth.md` で決める)。

## 使用する用語

以下の用語は `constitution.md § 用語集` を参照する。

- ボード (Board) — 権限境界の判定単位として参照 (本 spec の対象外)

本 spec 固有の用語。

| 用語 | 英訳 | 定義 |
|---|---|---|
| セッション | Session | ログイン中の状態を保持するサーバー側のレコード。Cookie の値 (`sid`) と対応する。 |
| セッション延長 | Refresh | 現在のセッションを破棄し、新しいセッションを発行して有効期限を延ばす操作。 |

## 参照する既存ファイル

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md` (認証ユーザーがボード作成時に `owner` になる規定を参照)
- `inputs/011_013_auth_invite_permissions_spec_input.md`

## 未決事項

- パスワードリセット (「パスワードを忘れた」 リンク経由の再設定) は本 spec の対象外。
- メール認証 (登録時の確認メール、メールアドレス変更確認) は本 spec の対象外。
- 2 要素認証 (TOTP / WebAuthn) は本 spec の対象外。
- 連続ログイン失敗時のレート制限、IP ブロック、CAPTCHA は本 spec の対象外。
- OAuth / OIDC 経由のソーシャルログイン (Google / GitHub 等) は本 spec の対象外。
- ユーザー情報の更新 (`name` / `email` / `password` 変更) は本 spec の対象外。
- ユーザーの物理削除 / 論理削除は本 spec の対象外。
- パスワードハッシュ方式 (`bcrypt` / `scrypt` / `argon2`) と cost 値、Cookie の `SameSite` / `Secure` 属性、Session の絶対 / 相対有効期限は設計工程 (`design/011_auth.md`) で決める。
- Session を Cookie ベースに固定するか、JWT に置き換えるかは設計工程で決める (本 spec は「Cookie ベースの Session テーブル」 を前提としている)。

## 作成または更新したファイル

- `spec/011_auth.md` (新規作成)
