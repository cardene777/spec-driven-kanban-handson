import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
const db = new Database("prisma/test.db");
for (const dir of readdirSync("prisma/migrations", { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()) {
 try { db.exec(readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8")); } catch (e) {
 if (!(e instanceof Error) || !e.message.includes("already exists")) throw e;
 }
}
db.close();
process.env.DATABASE_URL = "file:./prisma/test.db";
