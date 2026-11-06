"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSession, requireUser, setSession } from "@/lib/auth";
import { db, id, initialiseDatabase, now } from "@/lib/db";

export async function login(formData: FormData) {
  const parsed = z.object({ loginId: z.string().trim().min(2), password: z.string().min(8) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?error=invalid");
  await initialiseDatabase();
  const result = await db().execute({ sql: "SELECT * FROM users WHERE login_id = ? AND active = 1", args: [parsed.data.loginId.toUpperCase()] });
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, String(user.password_hash)))) redirect("/login?error=invalid");
  await setSession({ userId: String(user.id), loginId: String(user.login_id), role: user.role as "admin" | "participant", condition: user.condition_code as "A" | "B" | "C" | null });
  redirect(user.role === "admin" ? "/admin" : "/study");
}

export async function logout() { await clearSession(); redirect("/login"); }

export async function createParticipant(formData: FormData) {
  await requireUser("admin");
  const parsed = z.object({ loginId: z.string().trim().regex(/^P[A-Z0-9_-]{2,20}$/i), password: z.string().min(10), condition: z.enum(["A", "B", "C"]) }).parse(Object.fromEntries(formData));
  const userId = id("usr");
  await db().batch([
    { sql: "INSERT INTO users(id,login_id,password_hash,role,condition_code,created_at) VALUES(?,?,?,?,?,?)", args: [userId, parsed.loginId.toUpperCase(), await bcrypt.hash(parsed.password, 12), "participant", parsed.condition, now()] },
    { sql: "INSERT INTO studies(id,participant_id,updated_at) VALUES(?,?,?)", args: [id("study"), userId, now()] },
  ], "write");
  redirect("/admin?created=1");
}

export async function deleteParticipant(formData: FormData) {
  await requireUser("admin");
  const participantId = z.string().min(1).parse(formData.get("userId"));
  const participant = await db().execute({
    sql: "SELECT id FROM users WHERE id = ? AND role = 'participant'",
    args: [participantId],
  });
  if (!participant.rows[0]) redirect("/admin");

  await db().batch([
    { sql: "DELETE FROM ai_usage WHERE interaction_id IN (SELECT id FROM interactions WHERE participant_id = ?)", args: [participantId] },
    { sql: "DELETE FROM interactions WHERE participant_id = ?", args: [participantId] },
    { sql: "DELETE FROM scaffolds WHERE participant_id = ?", args: [participantId] },
    { sql: "DELETE FROM drafts WHERE participant_id = ?", args: [participantId] },
    { sql: "DELETE FROM submissions WHERE participant_id = ?", args: [participantId] },
    { sql: "DELETE FROM studies WHERE participant_id = ?", args: [participantId] },
    { sql: "DELETE FROM users WHERE id = ? AND role = 'participant'", args: [participantId] },
  ], "write");
  redirect("/admin?deleted=1");
}
