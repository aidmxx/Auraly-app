import { requireUser } from "@/lib/auth";
import { db, now } from "@/lib/db";

export async function POST() {
  const user = await requireUser("participant");
  const study = (await db().execute({
    sql: "SELECT status FROM studies WHERE participant_id=?",
    args: [user.userId],
  })).rows[0];
  if (!study || study.status !== "completed") {
    return Response.json({ error: "Finish the current writing before starting another." }, { status: 409 });
  }

  await db().execute({
    sql: `UPDATE studies SET status='not_started',started_at=NULL,submitted_at=NULL,
          completion_seconds=NULL,final_reflection='',final_word_count=0,
          questionnaire_json='{}',feedback='',updated_at=? WHERE participant_id=?`,
    args: [now(), user.userId],
  });
  return Response.json({ restarted: true });
}
