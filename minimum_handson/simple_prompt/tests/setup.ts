import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const tmpDir = path.join(process.cwd(), "tests", ".tmp");
const dbPath = path.join(tmpDir, "test.db");

fs.mkdirSync(tmpDir, { recursive: true });
if (fs.existsSync(dbPath)) fs.rmSync(dbPath);
process.env.DATABASE_URL = `file:${dbPath}`;

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const migrationDirs = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const db = new Database(dbPath);
for (const dir of migrationDirs) {
  db.exec(fs.readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
}
db.close();
