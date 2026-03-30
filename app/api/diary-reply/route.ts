import { generateDiaryReply } from "@/lib/ollama";
import { personas } from "@/data/personas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mood?: string;
      diaryText?: string;
      personaId?: string;
    };

    const mood = body.mood?.trim() ?? "neutral";
    const diaryText = body.diaryText?.trim() ?? "";
    const persona = personas.find((item) => item.id === body.personaId);

    if (!diaryText) {
      return Response.json(
        { error: "diaryText is required." },
        { status: 400 }
      );
    }

    const replyText = await generateDiaryReply(mood, diaryText, persona?.replyStyle);
    // TODO: Save request/response pairs to persistent storage for study analysis.
    return Response.json({ replyText });
  } catch (error) {
    console.error("POST /api/diary-reply failed:", error);
    return Response.json(
      { error: "Failed to generate diary reply." },
      { status: 500 }
    );
  }
}
