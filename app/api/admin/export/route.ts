import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { localiseTimestampFields, toSydneyTimestamp } from "@/lib/time";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  await requireUser("admin");
  const url = new URL(request.url);
  const participants = (await db().execute(`SELECT u.login_id participant_id,u.condition_code assigned_condition,u.active,s.* FROM users u LEFT JOIN studies s ON s.participant_id=u.id WHERE u.role='participant'`)).rows;
  const interactions = (await db().execute(`SELECT u.login_id participant_id,i.sequence_no,i.prompt_inputs_json,i.full_prompt,i.ai_response,i.created_at FROM interactions i JOIN users u ON u.id=i.participant_id`)).rows;
  const scaffolds = (await db().execute(`SELECT u.login_id participant_id,s.question,s.answer,s.created_at FROM scaffolds s JOIN users u ON u.id=s.participant_id`)).rows;
  const drafts = (await db().execute(`SELECT u.login_id participant_id,d.content,d.word_count,d.created_at FROM drafts d JOIN users u ON u.id=d.participant_id`)).rows;
  const submissions = (await db().execute(`SELECT u.login_id participant_id,s.* FROM submissions s JOIN users u ON u.id=s.participant_id ORDER BY s.submitted_at`)).rows;
  const aiUsage = (await db().execute(`SELECT u.login_id participant_id,i.sequence_no,a.* FROM ai_usage a JOIN interactions i ON i.id=a.interaction_id JOIN users u ON u.id=i.participant_id ORDER BY a.created_at`)).rows;
  const localise = (rows: typeof participants) => rows.map((row) => localiseTimestampFields({ ...row }));
  const payload = {
    exportedAt: toSydneyTimestamp(new Date()),
    timeZone: "Australia/Sydney",
    participants: localise(participants),
    submissions: localise(submissions),
    interactions: localise(interactions),
    aiUsage: localise(aiUsage),
    scaffolds: localise(scaffolds),
    drafts: localise(drafts),
  };

  if (url.searchParams.get("format") === "json") {
    return new Response(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="auraly-export.json"', "Cache-Control": "no-store" } });
  }
  const flat = payload.submissions;
  const headers = flat.length ? Object.keys(flat[0]) : ["participant_id", "condition_code", "completion_seconds", "edit_count", "prompt_length", "ai_output_length", "final_output_length"];
  const csv = [headers.map(csvCell).join(","), ...flat.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="auraly-submissions.csv"', "Cache-Control": "no-store" } });
}
