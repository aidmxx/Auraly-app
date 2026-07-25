import bcrypt from "bcryptjs";
import { db, id, initialiseDatabase, now, words } from "../lib/db";

async function backfillCompletedSubmissions() {
  const completed = (await db().execute(`SELECT s.participant_id,s.started_at,s.submitted_at,s.completion_seconds,
    s.final_reflection,s.final_word_count,u.condition_code
    FROM studies s JOIN users u ON u.id=s.participant_id
    WHERE s.status='completed' AND s.started_at IS NOT NULL AND s.submitted_at IS NOT NULL`)).rows;

  for (const study of completed) {
    const exists = await db().execute({
      sql: "SELECT 1 FROM submissions WHERE participant_id=? AND submitted_at=? LIMIT 1",
      args: [String(study.participant_id), String(study.submitted_at)],
    });
    if (exists.rows.length) continue;

    const interactions = (await db().execute({
      sql: "SELECT full_prompt,ai_response FROM interactions WHERE participant_id=? AND created_at>=? AND created_at<=? ORDER BY created_at",
      args: [String(study.participant_id), String(study.started_at), String(study.submitted_at)],
    })).rows;
    const edits = await db().execute({
      sql: "SELECT count(*) n FROM drafts WHERE participant_id=? AND created_at>=? AND created_at<=?",
      args: [String(study.participant_id), String(study.started_at), String(study.submitted_at)],
    });
    const prompts = interactions.map((row) => String(row.full_prompt));
    const outputs = interactions.map((row) => String(row.ai_response));
    await db().execute({
      sql: `INSERT INTO submissions(id,participant_id,condition_code,started_at,submitted_at,completion_seconds,
            edit_count,prompt_length,ai_output_length,final_output_length,final_reflection,prompts_json,ai_outputs_json,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        id("sub"), String(study.participant_id), String(study.condition_code), String(study.started_at),
        String(study.submitted_at), Number(study.completion_seconds) || 0, Number(edits.rows[0].n),
        prompts.reduce((total, value) => total + words(value), 0),
        outputs.reduce((total, value) => total + words(value), 0),
        Number(study.final_word_count) || words(String(study.final_reflection || "")),
        String(study.final_reflection || ""), JSON.stringify(prompts), JSON.stringify(outputs), String(study.submitted_at),
      ],
    });
  }
}

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
  await backfillCompletedSubmissions();
  console.log(`Admin account '${loginId}' is ready. Password is not printed or stored in plain text.`);
}
main().catch((error) => { console.error(error); process.exit(1); });
