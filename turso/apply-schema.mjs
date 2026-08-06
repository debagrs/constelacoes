import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.");
const db = createClient({ url, authToken });
const ddl = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
function splitStatements(sql) {
  const lines = sql.split("\n").filter((line) => !line.trim().startsWith("--"));
  const out = []; let buffer = []; let trigger = false;
  for (const line of lines) {
    buffer.push(line); const t = line.trim().toUpperCase();
    if (/CREATE\s+TRIGGER/.test(buffer.join(" ").toUpperCase())) trigger = true;
    const done = trigger ? t === "END;" : line.trim().endsWith(";");
    if (done) { const stmt = buffer.join("\n").trim().replace(/;$/, ""); if (stmt) out.push(stmt); buffer = []; trigger = false; }
  }
  return out;
}
const statements = splitStatements(ddl);
for (const statement of statements) await db.execute(statement);
console.log(`Esquema atualizado: ${statements.length} instruções aplicadas sem apagar o acervo.`);
