import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db, id, now, words } from "@/lib/db";

export async function POST(request: Request) {
  const user = await requireUser("participant"); const { content } = z.object({ content:z.string().max(50000) }).parse(await request.json());
  await db().batch([{sql:"INSERT INTO drafts(id,participant_id,content,word_count,created_at) VALUES(?,?,?,?,?)",args:[id("draft"),user.userId,content,words(content),now()]},{sql:"UPDATE studies SET final_reflection=?,final_word_count=?,updated_at=? WHERE participant_id=? AND status!='completed'",args:[content,words(content),now(),user.userId]}],"write");
  return Response.json({ saved:true });
}
