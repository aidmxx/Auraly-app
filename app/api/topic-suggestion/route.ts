import { generateTopicSuggestion } from "@/lib/ollama";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      diaryText?: string;
      consentToReuse?: boolean;
    };

    const diaryText = body.diaryText?.trim() ?? "";
    const consentToReuse = Boolean(body.consentToReuse);

    if (!consentToReuse) {
      return Response.json({
        topic: "",
        reason: "No topic generated because consent to reuse diary content is disabled.",
      });
    }

    if (!diaryText) {
      return Response.json(
        { error: "diaryText is required when consent is enabled." },
        { status: 400 }
      );
    }

    const suggestion = await generateTopicSuggestion(diaryText);
    // TODO: Store accepted/dismissed topic actions for user-control analysis.
    return Response.json(suggestion);
  } catch (error) {
    console.error("POST /api/topic-suggestion failed:", error);
    return Response.json(
      { error: "Failed to generate topic suggestion." },
      { status: 500 }
    );
  }
}
