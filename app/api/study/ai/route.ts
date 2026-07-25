import OpenAI from "openai";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db, id, now } from "@/lib/db";

const schema=z.object({inputs:z.record(z.string()),scaffolds:z.array(z.object({question:z.string(),answer:z.string()})).max(10)});
const instructions = "You support a controlled reflective-writing study. Help the participant think and write while preserving their agency and voice. Do not invent experiences. Be concise, constructive, and avoid clinical advice.";

export async function POST(request:Request){
  const user=await requireUser("participant"); const data=schema.parse(await request.json());
  if(user.condition==="A"&&!data.inputs.message) return Response.json({error:"Enter a message."},{status:400});
  if(user.condition!=="A"&&(!data.inputs.topic||!data.inputs.context||!data.inputs.goal)) return Response.json({error:"Complete every prompt field."},{status:400});
  if(user.condition==="C"&&data.scaffolds.some(x=>!x.answer.trim())) return Response.json({error:"Answer all scaffold questions."},{status:400});
  const fullPrompt=user.condition==="A"?data.inputs.message:`Help with a reflective writing task. Topic: ${data.inputs.topic}\nContext: ${data.inputs.context}\nTone: ${data.inputs.tone}\nWriting goal: ${data.inputs.goal}${user.condition==="C"?`\nScaffold reflections:\n${data.scaffolds.map(x=>`${x.question} ${x.answer}`).join("\n")}`:""}`;
  let response="";
  try {
    if ((process.env.AI_PROVIDER || "openai").toLowerCase() === "ollama") {
      const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
      const ollamaResponse = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.OLLAMA_MODEL || "gpt-oss:20b", stream: false, messages: [{ role: "system", content: instructions }, { role: "user", content: fullPrompt }] }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!ollamaResponse.ok) throw new Error(`OLLAMA_HTTP_${ollamaResponse.status}`);
      const result = z.object({ message: z.object({ content: z.string() }) }).parse(await ollamaResponse.json());
      response = result.message.content;
    } else {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_MISSING");
      const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
      const completion=await client.responses.create({model:process.env.OPENAI_MODEL||"gpt-5-mini",instructions,input:fullPrompt});
      response=completion.output_text;
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
    const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
    const diagnostic = error instanceof Error ? { name: error.name, message: error.message, cause: error.cause instanceof Error ? error.cause.message : undefined } : { name: "Unknown error" };
    console.error(`${provider} connection failed`, diagnostic);
    if (provider === "ollama") return Response.json({error:"Auraly could not reach local Ollama. Ensure Ollama is open, the configured model is downloaded, and OLLAMA_BASE_URL is correct."},{status:503});
    return Response.json({error:"The server could not reach OpenAI. Check the server terminal for the connection error, then verify the internet connection, VPN, firewall, and API configuration."},{status:503});
  }
  const count=await db().execute({sql:"SELECT count(*) n FROM interactions WHERE participant_id=?",args:[user.userId]}); const sequence=Number(count.rows[0].n)+1; const createdAt=now();
  await db().batch([{sql:"INSERT INTO interactions(id,participant_id,sequence_no,prompt_inputs_json,full_prompt,ai_response,created_at) VALUES(?,?,?,?,?,?,?)",args:[id("int"),user.userId,sequence,JSON.stringify(data.inputs),fullPrompt,response,createdAt]},...data.scaffolds.map(s=>({sql:"INSERT INTO scaffolds(id,participant_id,question,answer,created_at) VALUES(?,?,?,?,?)",args:[id("scf"),user.userId,s.question,s.answer,createdAt]}))],"write");
  return Response.json({response,interaction:{sequence,prompt:fullPrompt,response,createdAt}});
}
