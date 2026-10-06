import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "./route";

test("offline prototype keeps five questions and drafts only from supplied answers", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Ollama unavailable"); };
  try {
    const questionsResponse = await POST(new Request("http://localhost/prototype/api", {
      method: "POST",
      body: JSON.stringify({ action: "generateQuestions", prompt: "A difficult decision I made recently" }),
    }));
    const { questions } = await questionsResponse.json();
    assert.equal(questionsResponse.status, 200);
    assert.equal(questions.length, 5);
    assert.match(questions[0], /decision/i);

    const reflectionResponse = await POST(new Request("http://localhost/prototype/api", {
      method: "POST",
      body: JSON.stringify({ action: "composeReflection", prompt: "A difficult decision I made recently", answers: questions.map((question: string, index: number) => ({ question, answer: index === 0 ? "I rewrote my project after feedback." : "" })) }),
    }));
    const { reflection } = await reflectionResponse.json();
    assert.match(reflection, /I rewrote my project after feedback/);
    assert.doesNotMatch(reflection, /supervisor|deadline/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
