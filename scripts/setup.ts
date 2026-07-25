import bcrypt from "bcryptjs";
import { db, id, initialiseDatabase, now } from "../lib/db";

async function main() {
  await initialiseDatabase();
  const loginId = (process.env.ADMIN_LOGIN_ID || "ADMIN").toUpperCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error("Set ADMIN_PASSWORD to at least 12 characters before running setup.");
  await db().execute({
    sql: `INSERT INTO users(id,login_id,password_hash,role,condition_code,created_at)
          VALUES(?,?,?,?,NULL,?) ON CONFLICT(login_id) DO UPDATE SET password_hash=excluded.password_hash, active=1`,
    args: [id("usr"), loginId, await bcrypt.hash(password, 12), "admin", now()],
  });
  console.log(`Admin account '${loginId}' is ready. Password is not printed or stored in plain text.`);
}
main().catch((error) => { console.error(error); process.exit(1); });
