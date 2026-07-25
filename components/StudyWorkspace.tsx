"use client";

import { useEffect, useRef, useState } from "react";

type Interaction = { sequence: number; prompt: string; response: string; createdAt: string };
type PromptInputs = { message: string; topic: string; context: string; tone: string; goal: string };
type Scaffold = { question: string; answer: string };

const scaffoldQuestions = [
  "What happened, and why was it significant?",
  "What assumptions or feelings shaped your response?",
  "What did you learn, and what might you do differently?",
];

export default function StudyWorkspace({ condition, initialDraft, submitted, interactions: initial }: { condition: "A" | "B" | "C"; initialDraft: string; submitted: boolean; interactions: Interaction[] }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState(initialDraft);
  const [interactions, setInteractions] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [inputs, setInputs] = useState<PromptInputs>({ message: "", topic: "", context: "", tone: "Thoughtful", goal: "" });
  const [scaffolds, setScaffolds] = useState<Scaffold[]>(scaffoldQuestions.map((question) => ({ question, answer: "" })));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!draft || submitted) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetch("/api/study/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: draft }) }), 2000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [draft, submitted]);

  const updateInput = (key: keyof PromptInputs, value: string) => setInputs((current) => ({ ...current, [key]: value }));

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const relevantInputs = condition === "A" ? { message: inputs.message } : { topic: inputs.topic, context: inputs.context, tone: inputs.tone, goal: inputs.goal };
    try {
      const response = await fetch("/api/study/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inputs: relevantInputs, scaffolds: condition === "C" ? scaffolds : [] }) });
      const data = await response.json();
      if (!response.ok) return setMessage(data.error || "AI support is temporarily unavailable.");
      setInteractions((current) => [...current, data.interaction]);
      if (!draft) setDraft(data.response);
      setStep(2);
    } catch {
      setMessage("Auraly could not reach its server. Your text is still here; check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitFinal() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/study/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalReflection: draft }) });
      if (response.ok) location.reload();
      else setMessage("Submission failed. Your draft is still saved; please try again.");
    } catch {
      setMessage("Submission could not connect. Your draft is still saved; please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) return <section className="success-card"><div className="success-icon">✓</div><h2>Study task submitted</h2><p>Your reflection and writing-process data are securely recorded. You may now close this page.</p></section>;

  return <>
    <nav className="steps"><span className={step === 1 ? "active" : "done"}>1 · AI support</span><span className={step === 2 ? "active" : ""}>2 · Final reflection and submit</span></nav>
    {step === 1 && <section className="workspace-grid"><div className="panel"><h2>Request writing support</h2><p className="muted">Use AI for support, but keep your reflection authentic and personally meaningful. Your entries remain here after a successful request.</p>
      <form onSubmit={ask} className="stack">
        {condition === "A" ? <label>Your message<textarea value={inputs.message} onChange={(event) => updateInput("message", event.target.value)} rows={7} required placeholder="Ask for help reflecting, planning, or improving your writing…" /></label> : <>
          <label>Reflection topic<input value={inputs.topic} onChange={(event) => updateInput("topic", event.target.value)} required /></label>
          <label>Relevant context<textarea value={inputs.context} onChange={(event) => updateInput("context", event.target.value)} rows={3} required /></label>
          <div className="two-col"><label>Tone<select value={inputs.tone} onChange={(event) => updateInput("tone", event.target.value)}><option>Thoughtful</option><option>Personal</option><option>Analytical</option><option>Balanced</option></select></label><label>Writing goal<input value={inputs.goal} onChange={(event) => updateInput("goal", event.target.value)} required placeholder="What should the reflection achieve?" /></label></div>
        </>}
        {condition === "C" && <fieldset><legend>Reflective scaffold</legend><p className="muted">Answer these questions before requesting AI support.</p>{scaffolds.map((scaffold, index) => <label key={scaffold.question}>{scaffold.question}<textarea value={scaffold.answer} required rows={2} onChange={(event) => setScaffolds((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, answer: event.target.value } : item))} /></label>)}</fieldset>}
        <button className="primary" disabled={loading}>{loading ? "Generating support…" : "Request AI support"}</button>{message && <div className="error">{message}</div>}
      </form></div><div className="panel chat-panel"><h2>AI interaction log</h2>{!interactions.length ? <div className="empty">Your AI responses will appear here.</div> : interactions.map((interaction) => <article className="response" key={interaction.sequence}><small>Interaction {interaction.sequence}</small><p>{interaction.response}</p><button type="button" className="secondary" onClick={() => setDraft((current) => current ? `${current}\n\n${interaction.response}` : interaction.response)}>Add to draft</button></article>)}</div></section>}
    {step === 2 && <section className="panel editor"><div className="section-head"><div><h2>Write and submit your final reflection</h2><p className="muted">Edit freely. Draft snapshots save automatically while you work.</p></div><span>{draft.trim() ? draft.trim().split(/\s+/).length : 0} words</span></div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={18} placeholder="Write your final reflection here…" />{message && <div className="error">{message}</div>}<div className="actions"><button type="button" className="secondary" onClick={() => setStep(1)}>Back to AI support</button><button type="button" className="primary" disabled={!draft.trim() || loading} onClick={submitFinal}>{loading ? "Submitting…" : "Submit final reflection"}</button></div></section>}
  </>;
}
