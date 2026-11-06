import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db, id, now, words } from "@/lib/db";
import { validateFinalReflection } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await requireUser("participant");
  const parsed = z.object({ finalReflection: z.string().trim().max(12000) }).safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Final reflection is too long or missing." }, { status: 400 });
  const data = parsed.data;
  const validation = validateFinalReflection(data.finalReflection);
  if (!validation.valid) return Response.json({ error: validation.error }, { status: 400 });
  const study = (await db().execute({ sql: "SELECT started_at,status FROM studies WHERE participant_id=?", args: [user.userId] })).rows[0];
  if (study.status === "completed") return Response.json({ submitted: true });
  const submitted = now();
  const startedAt = String(study.started_at);
  const seconds = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
  const interactions = (await db().execute({
    sql: "SELECT full_prompt,ai_response,created_at FROM interactions WHERE participant_id=? AND created_at>=? AND created_at<=? ORDER BY created_at",
    args: [user.userId, startedAt, submitted],
  })).rows;
  const editResult = await db().execute({
    sql: "SELECT count(*) edits FROM drafts WHERE participant_id=? AND created_at>=? AND created_at<=?",
    args: [user.userId, startedAt, submitted],
  });
  const prompts = interactions.map((row) => String(row.full_prompt));
  const aiOutputs = interactions.map((row) => String(row.ai_response));
  const promptLength = prompts.reduce((total, prompt) => total + words(prompt), 0);
  const aiOutputLength = aiOutputs.reduce((total, output) => total + words(output), 0);
  const submissionId = id("sub");
  await db().batch([
    { sql: "INSERT INTO drafts(id,participant_id,content,word_count,created_at) VALUES(?,?,?,?,?)", args: [id("draft"), user.userId, data.finalReflection, words(data.finalReflection), submitted] },
    { sql: `INSERT INTO submissions(id,participant_id,condition_code,started_at,submitted_at,completion_seconds,edit_count,prompt_length,ai_output_length,final_output_length,final_reflection,prompts_json,ai_outputs_json,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: [submissionId, user.userId, user.condition!, startedAt, submitted, seconds, Number(editResult.rows[0].edits) + 1, promptLength, aiOutputLength, words(data.finalReflection), data.finalReflection, JSON.stringify(prompts), JSON.stringify(aiOutputs), submitted] },
    { sql: "UPDATE studies SET status='completed',submitted_at=?,completion_seconds=?,final_reflection=?,final_word_count=?,updated_at=? WHERE participant_id=?", args: [submitted, seconds, data.finalReflection, words(data.finalReflection), submitted, user.userId] },
  ], "write");
  return Response.json({ submitted: true, submissionId });
}
