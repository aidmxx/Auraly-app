import { z } from "zod";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generateQuestions"), prompt: z.string().trim().min(1).max(2000) }),
  z.object({
    action: z.literal("composeReflection"),
    prompt: z.string().trim().min(1).max(2000),
    answers: z.array(z.object({ question: z.string().max(1000), answer: z.string().max(5000) })).length(5),
  }),
]);

const decisionQuestions = [
  "What factors influenced your decision the most?",
  "How did you feel before, during, and after making this decision?",
  "Who did you seek advice from, and how did that affect your final choice?",
  "What were the potential consequences of your decision, and how have they unfolded so far?",
  "Reflect on what you’ve learned from this experience; how might it impact future decisions?",
];
const generalQuestions = [
  "What happened in this experience?",
  "How did you feel at the time?",
  "What mattered most to you in that moment?",
  "How did other people or circumstances affect your experience?",
  "What did you learn, and what might you do differently in the future?",
];

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid prototype request." }, { status: 400 });
  const data = parsed.data;
  const fallbackQuestions = /decision/i.test(data.prompt) ? decisionQuestions : generalQuestions;

  if (data.action === "generateQuestions") {
    const text = await generate(`Write exactly five short, distinct reflective questions for this prompt. Return only a JSON array of five strings. Do not answer the questions or write a reflection.\n\nPrompt: ${data.prompt}`);
    let questions: unknown;
    try { questions = JSON.parse(text ?? ""); } catch { questions = null; }
    const valid = z.array(z.string().trim().min(1)).length(5).safeParse(questions);
    return Response.json({ questions: valid.success ? valid.data : fallbackQuestions });
  }

  const answered = data.answers.filter(({ answer }) => answer.trim());
  const fallback = `I reflected on: ${data.prompt}.\n\n${answered.map(({ answer }) => answer.trim()).join("\n\n")}`;
  const text = answered.length ? await generate(`Write a first-person reflective draft using only the writer's answers below. Preserve their meaning and voice. Do not invent events, feelings, or outcomes. Return only the draft.\n\nPrompt: ${data.prompt}\n\n${answered.map(({ question, answer }) => `${question}\n${answer}`).join("\n\n")}`) : null;
  return Response.json({ reflection: text?.trim() || fallback });
}

async function generate(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(`${process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.PROTOTYPE_OLLAMA_MODEL || "qwen2.5:7b", prompt, stream: false }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.response === "string" ? data.response : null;
  } catch {
    return null;
  }
}
