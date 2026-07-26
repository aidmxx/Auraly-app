import StudyWorkspace from "@/components/StudyWorkspace";
import { logout } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { conditions } from "@/lib/study";
import { db, now } from "@/lib/db";

export default async function StudyPage() {
  const user = await requireUser("participant");
  const study = (await db().execute({ sql: "SELECT * FROM studies WHERE participant_id = ?", args: [user.userId] })).rows[0];
  let startedAt = study.started_at ? String(study.started_at) : "";
  if (study.status === "not_started") {
    startedAt = now();
    await db().execute({ sql: "UPDATE studies SET status='in_progress',started_at=?,updated_at=? WHERE participant_id=?", args: [startedAt, startedAt, user.userId] });
  }
  const interactions = startedAt ? (await db().execute({ sql: "SELECT sequence_no,full_prompt,ai_response,created_at FROM interactions WHERE participant_id=? AND created_at>=? ORDER BY sequence_no", args: [user.userId, startedAt] })).rows : [];
  const condition = user.condition!;
  return <main className="app-shell">
    <header className="topbar"><div><strong>Auraly</strong><span>Reflective Writing Study</span></div><div><span className="participant-pill">{user.loginId}</span><form action={logout}><button className="link-button">Sign out</button></form></div></header>
    <section className="study-heading"><h1>{conditions[condition].name}</h1><p>{conditions[condition].description}</p></section>
    <StudyWorkspace condition={condition} initialDraft={String(study.final_reflection || "")} submitted={study.status === "completed"} interactions={interactions.map(r => ({ sequence: Number(r.sequence_no), prompt: String(r.full_prompt), response: String(r.ai_response), createdAt: String(r.created_at) }))} />
  </main>;
}
