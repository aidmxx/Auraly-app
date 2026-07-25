import OpenAI from "openai";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db, id, now } from "@/lib/db";
import { validateReadableText, validateSupportRequest } from "@/lib/validation";

const schema=z.object({
  mode:z.enum(["support","extend"]).default("support"),
  inputs:z.record(z.string()),
  scaffolds:z.array(z.object({question:z.string(),answer:z.string()})).max(10),
  selectedSupport:z.string().max(12000).optional(),
});
const instructions = "You support a controlled reflective-writing study. Help the participant think and write while preserving their agency and voice. Do not invent experiences. Be concise, constructive, and avoid clinical advice. The application has already checked that the participant supplied enough detail. Respond with useful reflective-writing support based only on that detail. Do not reply with a questionnaire or ask the participant for missing information. Do not claim that placeholder text is a real topic.";

export async function POST(request:Request){
  const user=await requireUser("participant"); const data=schema.parse(await request.json());
  let fullPrompt = "";
  if (data.mode === "extend") {
    const instructionValidation = validateReadableText(data.inputs.instruction ?? "", {
      label: "Follow-up request",
      minWords: 4,
      minCharacters: 15,
      maxWords: 100,
    });
    if (!instructionValidation.valid) return Response.json({ error: instructionValidation.error }, { status: 400 });
    if (!data.selectedSupport?.trim()) return Response.json({ error: "Select or enter AI support before requesting a follow-up." }, { status: 400 });
    fullPrompt = `Revise the selected writing support according to the participant's follow-up request. Return replacement text that can stand on its own. Use only details already present; do not invent personal experiences.\n\nPARTICIPANT FOLLOW-UP REQUEST:\n${data.inputs.instruction}\n\nSELECTED WRITING SUPPORT:\n${data.selectedSupport}`;
  } else {
    const validation = validateSupportRequest(user.condition!, data.inputs, data.scaffolds);
    if (!validation.valid) return Response.json({ error: validation.error }, { status: 400 });
    fullPrompt=user.condition==="A"?data.inputs.message:`Help with a reflective writing task. Topic: ${data.inputs.topic}\nContext: ${data.inputs.context}\nTone: ${data.inputs.tone}\nWriting goal: ${data.inputs.goal}${user.condition==="C"?`\nScaffold reflections:\n${data.scaffolds.map(x=>`${x.question} ${x.answer}`).join("\n")}`:""}`;
  }
  let response="";
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  let model = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let totalTokens: number | null = null;
  const requestStarted = Date.now();
  const maxOutputTokens = Math.min(2000, Math.max(100, Number(process.env.AI_MAX_OUTPUT_TOKENS) || 600));
  try {
    if (provider === "ollama") {
      const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
      model = process.env.OLLAMA_MODEL || "gpt-oss:20b";
      const ollamaResponse = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, stream: false, options: { num_predict: maxOutputTokens }, messages: [{ role: "system", content: instructions }, { role: "user", content: fullPrompt }] }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!ollamaResponse.ok) throw new Error(`OLLAMA_HTTP_${ollamaResponse.status}`);
      const result = z.object({
        message: z.object({ content: z.string() }),
        prompt_eval_count: z.number().optional(),
        eval_count: z.number().optional(),
      }).parse(await ollamaResponse.json());
      response = result.message.content;
      inputTokens = result.prompt_eval_count ?? null;
      outputTokens = result.eval_count ?? null;
      totalTokens = inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null;
    } else {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_MISSING");
      const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
      model = process.env.OPENAI_MODEL || "gpt-5-mini";
      const completion=await client.responses.create({model,instructions,input:fullPrompt,max_output_tokens:maxOutputTokens});
      response=completion.output_text;
      inputTokens = completion.usage?.input_tokens ?? null;
      outputTokens = completion.usage?.output_tokens ?? null;
      totalTokens = completion.usage?.total_tokens ?? null;
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      // Log diagnostic metadata only. Never log credentials or participant prompts.
      console.error("OpenAI request failed", { status: error.status, code: error.code, requestId: error.requestID });
      if (error.status === 401) return Response.json({error:"The server's OpenAI API key is invalid or has been revoked. Ask the researcher to replace it and restart Auraly."},{status:503});
      if (error.status === 429) return Response.json({error:"The OpenAI account has reached its usage limit or has no available API credit. Ask the researcher to check API billing and limits."},{status:503});
      if (error.status === 404 || error.code === "model_not_found") return Response.json({error:"The configured AI model is not available to this OpenAI project. Ask the researcher to check OPENAI_MODEL."},{status:503});
      return Response.json({error:`OpenAI rejected the request (status ${error.status ?? "unknown"}). Ask the researcher to check the server terminal.`},{status:503});
    }
    const diagnostic = error instanceof Error ? { name: error.name, message: error.message, cause: error.cause instanceof Error ? error.cause.message : undefined } : { name: "Unknown error" };
    console.error(`${provider} connection failed`, diagnostic);
    if (provider === "ollama") return Response.json({error:"Auraly could not reach local Ollama. Ensure Ollama is open, the configured model is downloaded, and OLLAMA_BASE_URL is correct."},{status:503});
    return Response.json({error:"The server could not reach OpenAI. Check the server terminal for the connection error, then verify the internet connection, VPN, firewall, and API configuration."},{status:503});
  }
  const count=await db().execute({sql:"SELECT count(*) n FROM interactions WHERE participant_id=?",args:[user.userId]}); const sequence=Number(count.rows[0].n)+1; const createdAt=now();
  const interactionId = id("int");
  const durationMs = Date.now() - requestStarted;
  await db().batch([
    {sql:"INSERT INTO interactions(id,participant_id,sequence_no,prompt_inputs_json,full_prompt,ai_response,created_at) VALUES(?,?,?,?,?,?,?)",args:[interactionId,user.userId,sequence,JSON.stringify(data.inputs),fullPrompt,response,createdAt]},
    {sql:"INSERT INTO ai_usage(id,interaction_id,provider,model,input_tokens,output_tokens,total_tokens,duration_ms,created_at) VALUES(?,?,?,?,?,?,?,?,?)",args:[id("usage"),interactionId,provider,model,inputTokens,outputTokens,totalTokens,durationMs,createdAt]},
    ...data.scaffolds.map(s=>({sql:"INSERT INTO scaffolds(id,participant_id,question,answer,created_at) VALUES(?,?,?,?,?)",args:[id("scf"),user.userId,s.question,s.answer,createdAt]})),
  ],"write");
  return Response.json({response,interaction:{sequence,prompt:fullPrompt,response,createdAt},usage:{provider,model,inputTokens,outputTokens,totalTokens,durationMs}});
}
