from pathlib import Path
import json
p=Path('prompt')
(p/'tests/setup.ts').write_text('''import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
const db = new Database("prisma/test.db");
for (const dir of readdirSync("prisma/migrations").sort()) {
 try { db.exec(readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8")); } catch (e) {
 if (!(e instanceof Error) || !e.message.includes("already exists")) throw e;
 }
}
db.close();
process.env.DATABASE_URL = "file:./prisma/test.db";
''')
f=p/'vitest.config.ts';f.write_text(f.read_text().replace('environment: "node",','environment: "node", setupFiles: ["./tests/setup.ts"],'))
