"use client";

import { useEffect, useRef, useState } from "react";
import { validateFinalReflection, validateReadableText, validateSupportRequest } from "@/lib/validation";

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
  const [draft, setDraft] = useState(() => initial.some((interaction) => interaction.response.trim() === initialDraft.trim()) ? "" : initialDraft);
  const [selectedSupport, setSelectedSupport] = useState("");
  const [selectedInteraction, setSelectedInteraction] = useState<number | null>(null);
  const [followUp, setFollowUp] = useState("");
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

  function selectResponse(interaction: Interaction) {
    setSelectedSupport(interaction.response);
    setSelectedInteraction(interaction.sequence);
    setDraft((current) => interactions.some((item) => item.response.trim() === current.trim()) ? "" : current);
    setMessage("");
    setStep(2);
  }

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const relevantInputs = condition === "A" ? { message: inputs.message } : { topic: inputs.topic, context: inputs.context, tone: inputs.tone, goal: inputs.goal };
    const validation = validateSupportRequest(condition, relevantInputs, condition === "C" ? scaffolds : []);
    if (!validation.valid) {
      setMessage(validation.error);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/study/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inputs: relevantInputs, scaffolds: condition === "C" ? scaffolds : [] }) });
      const data = await response.json();
      if (!response.ok) return setMessage(data.error || "AI support is temporarily unavailable.");
      setInteractions((current) => [...current, data.interaction]);
    } catch {
      setMessage("Auraly could not reach its server. Your text is still here; check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function extendSelectedSupport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const validation = validateReadableText(followUp, {
      label: "Follow-up request",
      minWords: 4,
      minCharacters: 15,
      maxWords: 100,
    });
    if (!validation.valid) {
      setMessage(validation.error);
      setLoading(false);
      return;
    }
    if (!selectedSupport.trim()) {
      setMessage("Select or enter AI support before requesting a follow-up.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/study/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "extend",
          inputs: { instruction: followUp },
          selectedSupport,
          scaffolds: [],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Extended AI support is temporarily unavailable.");
        return;
      }
      setInteractions((current) => [...current, data.interaction]);
      setSelectedSupport(data.response);
      setSelectedInteraction(data.interaction.sequence);
      setFollowUp("");
    } catch {
      setMessage("Auraly could not reach its server. Your writing is still here; check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitFinal() {
    setLoading(true);
    setMessage("");
    const validation = validateFinalReflection(draft);
    if (!validation.valid) {
      setMessage(validation.error);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/study/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalReflection: draft }) });
      if (response.ok) location.reload();
      else {
        const data = await response.json().catch(() => null);
        setMessage(data?.error || "Submission failed. Your draft is still saved; please try again.");
      }
    } catch {
      setMessage("Submission could not connect. Your draft is still saved; please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function startAnotherWriting() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/study/restart", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "A new writing could not be started.");
        return;
      }
      location.reload();
    } catch {
      setMessage("Auraly could not start another writing. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) return <section className="success-card"><div className="success-icon">✓</div><h2>Study task submitted</h2><p>Your reflection and writing-process data are securely recorded.</p>{message && <div className="error" role="alert">{message}</div>}<button type="button" className="primary" disabled={loading} onClick={startAnotherWriting}>{loading ? "Preparing a clean workspace…" : "Submit for another writing"}</button></section>;

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
        <button className="primary" disabled={loading}>{loading ? "Generating support…" : "Request AI support"}</button>{message && <div className="error" role="alert">{message}</div>}
      </form></div><div className="panel chat-panel"><h2>AI interaction log</h2>{!interactions.length ? <div className="empty">Your AI responses will appear here.</div> : interactions.map((interaction) => <article className="response" key={interaction.sequence}><small>Interaction {interaction.sequence}</small><p>{interaction.response}</p><button type="button" className="secondary" onClick={() => selectResponse(interaction)}>Use this response while writing</button></article>)}</div></section>}
    {step === 2 && <section className="workspace-grid writing-workspace">
      <div className="panel editor"><div className="section-head"><div><h2>Selected AI support</h2><p className="muted">{selectedInteraction ? `Interaction ${selectedInteraction} only. Edit these notes if helpful.` : "No AI response selected."}</p></div></div><textarea value={selectedSupport} onChange={(event) => setSelectedSupport(event.target.value)} rows={18} placeholder="Select one AI interaction to use as a reference…" />
        <form className="stack follow-up-form" onSubmit={extendSelectedSupport}><div><h3>Extend this AI support</h3><p className="muted">Ask AI to rewrite, expand, shorten, or turn the selected material into a polished paragraph. The result will replace the left box and be saved as a new interaction.</p></div><label>Follow-up request<textarea value={followUp} onChange={(event) => setFollowUp(event.target.value)} rows={3} maxLength={800} placeholder="For example: Based on this structure, write one polished reflective paragraph." required /></label><button className="primary" disabled={loading || !selectedSupport.trim()}>{loading ? "Generating replacement…" : "Replace with extended AI response"}</button></form>
      </div>
      <div className="panel editor"><div className="section-head"><div><h2>Your final reflection</h2><p className="muted">Write in your own words based on your understanding (30–1,500 words). Only this box is saved and submitted.</p></div><span>{draft.trim() ? draft.trim().split(/\s+/).length : 0} words</span></div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={18} maxLength={12000} placeholder="Write your final reflection here…" />{message && <div className="error" role="alert">{message}</div>}<div className="actions"><button type="button" className="secondary" onClick={() => setStep(1)}>Back to AI support</button><button type="button" className="primary" disabled={!draft.trim() || loading} onClick={submitFinal}>{loading ? "Submitting…" : "Submit final reflection"}</button></div></div>
    </section>}
  </>;
}
