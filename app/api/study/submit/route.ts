import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db, id, now, words } from "@/lib/db";

export async function POST(request: Request) {
  const user = await requireUser("participant");
  const data = z.object({ finalReflection: z.string().trim().min(20).max(50000) }).parse(await request.json());
  const study = (await db().execute({ sql: "SELECT started_at,status FROM studies WHERE participant_id=?", args: [user.userId] })).rows[0];
  if (study.status === "completed") return Response.json({ submitted: true });
  const submitted = now();
  const seconds = Math.max(0, Math.round((Date.now() - new Date(String(study.started_at)).getTime()) / 1000));
  await db().batch([
    { sql: "INSERT INTO drafts(id,participant_id,content,word_count,created_at) VALUES(?,?,?,?,?)", args: [id("draft"), user.userId, data.finalReflection, words(data.finalReflection), submitted] },
    { sql: "UPDATE studies SET status='completed',submitted_at=?,completion_seconds=?,final_reflection=?,final_word_count=?,updated_at=? WHERE participant_id=?", args: [submitted, seconds, data.finalReflection, words(data.finalReflection), submitted, user.userId] },
  ], "write");
  return Response.json({ submitted: true });
}
