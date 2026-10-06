"use client";

import { useState } from "react";
import styles from "./prototype.module.css";

const presets = [
  "A time when I faced a challenge and what I learned",
  "A moment when I felt proud of myself",
  "A difficult decision I made recently",
  "Something I want to understand better about myself",
];
const steps = ["Prompt Construction", "Scaffolded Reflection", "Final Reflection", "Ownership Check"];
const ratings = ["Not at all mine", "Slightly mine", "Somewhat mine", "Mostly mine", "Completely mine"];

export default function Workflow() {
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState(presets[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [prompt, setPrompt] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(Array(5).fill(""));
  const [reflection, setReflection] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);

  async function request(body: object) {
    const response = await fetch("/prototype/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("The request failed. Please try again.");
    return response.json();
  }

  async function continueToQuestions() {
    const selected = customPrompt.trim() || preset;
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const data = await request({ action: "generateQuestions", prompt: selected });
      setPrompt(selected);
      setQuestions(data.questions);
      setAnswers(Array(5).fill(""));
      setStep(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate questions.");
    } finally {
      setBusy(false);
    }
  }

  async function composeReflection() {
    if (!answers.some((answer) => answer.trim())) {
      setError("Please answer at least one question before composing your reflection.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await request({
        action: "composeReflection",
        prompt,
        answers: questions.map((question, index) => ({ question, answer: answers[index] })),
      });
      setReflection(data.reflection);
      setStep(2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not compose the reflection.");
    } finally {
      setBusy(false);
    }
  }

  function finishDemo() {
    if (rating === null) {
      setError("Please choose a rating from 1 to 5 before finishing.");
      return;
    }
    setError("");
    setFinished(true);
  }

  return (
    <main className={styles.shell}>
      <div className={styles.wrap}>
        <h1>Auraly AI Prototype</h1>
        <nav aria-label="Prototype steps" className={styles.steps}>
          {steps.map((label, index) => (
            <div key={label} className={`${styles.step} ${step === index ? styles.activeStep : ""}`} aria-current={step === index ? "step" : undefined}>
              <span className={styles.stepNumber}>{index + 1}</span>{label}
            </div>
          ))}
        </nav>

        {error && <p role="alert" className={styles.error}>{error}</p>}

        {finished ? (
          <section className={styles.card}>Demo complete. This prototype illustrates how prompt involvement may support active contribution and perceived ownership.</section>
        ) : step === 0 ? (
          <section className={styles.card}>
            <h2>Prompt Construction</h2>
            <p className={styles.intro}>Choose or write a reflective prompt. Your prompt will guide the AI support, but the reflection remains based on your own input.</p>
            <fieldset className={styles.presetList}>
              <legend>Preset prompts</legend>
              {presets.map((option) => (
                <label key={option} className={styles.preset}>
                  <input type="radio" name="preset" checked={preset === option} onChange={() => setPreset(option)} />
                  {option}
                </label>
              ))}
            </fieldset>
            <label className={styles.field} htmlFor="custom-prompt">Or write your own reflective prompt</label>
            <textarea id="custom-prompt" rows={5} placeholder="Type your reflective prompt..." value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} />
            <p className={styles.hint}>If this field has text, it overrides the preset you selected above.</p>
            <button className={styles.primary} disabled={busy} onClick={continueToQuestions}>{busy ? "Generating questions..." : "Continue to Reflection Questions"}</button>
          </section>
        ) : step === 1 ? (
          <section className={styles.card}>
            <h2>Scaffolded Reflection</h2>
            <p className={styles.intro}>These questions are for reflection support, not a finished answer.</p>
            <p className={styles.promptBox}><strong>Your prompt: </strong>{prompt}</p>
            <div className={styles.questions}>
              {questions.map((question, index) => (
                <label className={styles.field} key={index}>
                  {index + 1}. {question}
                  <textarea rows={4} placeholder="Your response..." value={answers[index]} onChange={(event) => setAnswers((previous) => previous.map((answer, i) => i === index ? event.target.value : answer))} />
                </label>
              ))}
            </div>
            <div className={styles.actions}>
              <button className={styles.primary} disabled={busy} onClick={composeReflection}>{busy ? "Drafting reflection..." : "Compose Final Reflection"}</button>
              <button className={styles.secondary} disabled={busy} onClick={() => { setError(""); setStep(0); }}>Back</button>
            </div>
          </section>
        ) : step === 2 ? (
          <section className={styles.card}>
            <h2>Editable Final Reflection</h2>
            <p className={styles.intro}>This draft is generated from your own prompt and responses. You can edit it before saving.</p>
            <label className={styles.field} htmlFor="final-reflection">Your reflection (editable)</label>
            <textarea id="final-reflection" className={styles.reflection} rows={14} value={reflection} onChange={(event) => setReflection(event.target.value)} />
            <div className={styles.actions}>
              <button className={styles.primary} onClick={() => { setError(""); setStep(3); }}>Continue to Ownership Check</button>
              <button className={styles.secondary} onClick={() => { setError(""); setStep(1); }}>Back</button>
            </div>
          </section>
        ) : (
          <section className={styles.card}>
            <h2>Ownership Check</h2>
            <fieldset className={styles.ownership}>
              <legend>To what extent does this final reflection feel like your own work?</legend>
              <div className={styles.ratings}>
                {ratings.map((label, index) => (
                  <label key={label} className={`${styles.rating} ${rating === index + 1 ? styles.selectedRating : ""}`}>
                    <input type="radio" name="ownership" value={index + 1} checked={rating === index + 1} onChange={() => setRating(index + 1)} />
                    <strong>{index + 1}</strong> {label}
                  </label>
                ))}
              </div>
              <p className={styles.hint}>1 = Not at all mine ... 5 = Completely mine</p>
            </fieldset>
            <label className={styles.field} htmlFor="ownership-reason">Why did you choose this rating?</label>
            <textarea id="ownership-reason" rows={4} placeholder="Optional explanation..." value={reason} onChange={(event) => setReason(event.target.value)} />
            <div className={styles.actions}>
              <button className={styles.primary} onClick={finishDemo}>Finish Demo</button>
              <button className={styles.secondary} onClick={() => { setError(""); setStep(2); }}>Back</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
