// テスト用の隔離された SQLite DB を用意する。
// lib/prisma.ts が DATABASE_URL を読む前に、この setupFile が env を設定し、
// マイグレーション SQL を適用してテーブルを作成する。
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const tmpDir = path.join(process.cwd(), "tests", ".tmp");
const dbPath = path.join(tmpDir, "test.db");

fs.mkdirSync(tmpDir, { recursive: true });
// 各テスト実行を毎回まっさらな DB から始める
if (fs.existsSync(dbPath)) fs.rmSync(dbPath);

process.env.DATABASE_URL = `file:${dbPath}`;

// prisma/migrations 配下の migration.sql をすべて適用する
const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const migrationDirs = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const db = new Database(dbPath);
for (const dir of migrationDirs) {
  const sqlPath = path.join(migrationsDir, dir, "migration.sql");
  if (fs.existsSync(sqlPath)) {
    db.exec(fs.readFileSync(sqlPath, "utf8"));
  }
}
db.close();
