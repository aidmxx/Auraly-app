import { createParticipant, logout, setParticipantActive } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "./admin.module.css";

const duration = (seconds: unknown) => {
  const value = Number(seconds);
  return value < 60 ? `${value} sec` : `${Math.floor(value / 60)} min ${value % 60} sec`;
};

const jsonStrings = (value: unknown) => {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{created?:string}> }) {
  const admin = await requireUser("admin");
  const rows = (await db().execute(`SELECT u.id,u.login_id,u.condition_code,u.active,u.created_at,s.status,s.started_at,s.submitted_at,s.completion_seconds,s.final_word_count,
    (SELECT count(*) FROM interactions i WHERE i.participant_id=u.id) interactions,
    (SELECT count(*) FROM drafts d WHERE d.participant_id=u.id) drafts
    FROM users u LEFT JOIN studies s ON s.participant_id=u.id WHERE u.role='participant' ORDER BY u.created_at DESC`)).rows;
  const submissions = (await db().execute(`SELECT s.*,u.login_id FROM submissions s JOIN users u ON u.id=s.participant_id ORDER BY s.submitted_at DESC`)).rows;
  const aiRuns = (await db().execute(`SELECT a.*,u.login_id,i.sequence_no
    FROM ai_usage a JOIN interactions i ON i.id=a.interaction_id
    JOIN users u ON u.id=i.participant_id ORDER BY a.created_at DESC LIMIT 500`)).rows;
  const complete = submissions.length;
  return <main className="app-shell"><header className="topbar"><div><strong>Auraly Research Console</strong><span>Signed in as {admin.loginId}</span></div><form action={logout}><button className="link-button">Sign out</button></form></header>
    <section className="admin-heading"><div><p className="eyebrow">RESEARCHER ACCESS</p><h1>Study overview</h1><p>Participant accounts are anonymous. Passwords are irreversibly hashed and cannot be viewed.</p></div><div className="stats"><span><b>{rows.length}</b>participants</span><span><b>{complete}</b>submissions</span><span><b>{rows.filter(r=>r.status==="in_progress").length}</b>in progress</span></div></section>
    {(await searchParams).created&&<div className="success-banner">Participant account created.</div>}
    <section className="panel"><div className="section-head"><div><h2>Create participant account</h2><p className="muted">Give the generated credentials to exactly one participant using a separate secure channel.</p></div></div><form action={createParticipant} className="inline-form"><label>Login ID<input name="loginId" placeholder="P001" pattern="P[A-Za-z0-9_-]{2,20}" required/></label><label>Temporary password<input name="password" type="password" minLength={10} required/></label><label>Assigned condition<select name="condition"><option value="A">A · General AI</option><option value="B">B · Prompt construction</option><option value="C">C · Prompt + scaffold</option></select></label><button className="primary">Create account</button></form></section>
    <section className="panel"><div className="section-head"><div><h2>Participant progress</h2><p className="muted">Condition assignments cannot be changed after account creation, protecting experimental integrity.</p></div><div className="export-links"><a href="/api/admin/export?format=csv">Export CSV</a><a href="/api/admin/export?format=json">Export JSON</a></div></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>Condition</th><th>Status</th><th>Started</th><th>Submitted</th><th>Time</th><th>Words</th><th>AI uses</th><th>Drafts</th><th>Access</th></tr></thead><tbody>{rows.map(r=><tr key={String(r.id)}><td><strong>{String(r.login_id)}</strong></td><td>{String(r.condition_code)}</td><td><span className={`status ${r.status}`}>{String(r.status).replace("_"," ")}</span></td><td>{r.started_at?new Date(String(r.started_at)).toLocaleString():"—"}</td><td>{r.submitted_at?new Date(String(r.submitted_at)).toLocaleString():"—"}</td><td>{r.completion_seconds?`${Math.round(Number(r.completion_seconds)/60)} min`:"—"}</td><td>{Number(r.final_word_count)||"—"}</td><td>{Number(r.interactions)}</td><td>{Number(r.drafts)}</td><td><form action={setParticipantActive}><input type="hidden" name="userId" value={String(r.id)}/><input type="hidden" name="active" value={Number(r.active)?"0":"1"}/><button className="small-button">{Number(r.active)?"Disable":"Enable"}</button></form></td></tr>)}</tbody></table></div></section>
    <section className="panel"><div className="section-head"><div><h2>AI run usage</h2><p className="muted">Token counts and response time for each newly generated AI interaction. Older runs created before usage tracking show only in the writing archive.</p></div></div><div className="table-wrap"><table><thead><tr><th>Participant</th><th>Interaction</th><th>Provider</th><th>Model</th><th>Input tokens</th><th>Output tokens</th><th>Total tokens</th><th>Response time</th><th>Generated</th></tr></thead><tbody>{aiRuns.length ? aiRuns.map(run=><tr key={String(run.id)}><td><strong>{String(run.login_id)}</strong></td><td>{Number(run.sequence_no)}</td><td>{String(run.provider)}</td><td>{String(run.model)}</td><td>{run.input_tokens==null?"—":Number(run.input_tokens)}</td><td>{run.output_tokens==null?"—":Number(run.output_tokens)}</td><td>{run.total_tokens==null?"—":Number(run.total_tokens)}</td><td>{(Number(run.duration_ms)/1000).toFixed(1)} sec</td><td>{new Date(String(run.created_at)).toLocaleString()}</td></tr>) : <tr><td colSpan={9}>No token-tracked AI runs yet.</td></tr>}</tbody></table></div></section>
    <section className="panel"><div className="section-head"><div><h2>Completed writing submissions</h2><p className="muted">Each row is an archived submission. Starting another writing does not change these records.</p></div></div><div className="table-wrap"><table><thead><tr><th>Participant</th><th>Condition</th><th>Submitted</th><th>Completion time</th><th>Number of edits</th><th>Prompt length</th><th>AI output length</th><th>Final output length</th><th>Writing record</th></tr></thead><tbody>{submissions.length ? submissions.map(submission => {
      const prompts = jsonStrings(submission.prompts_json);
      const outputs = jsonStrings(submission.ai_outputs_json);
      return <tr key={String(submission.id)}><td><strong>{String(submission.login_id)}</strong></td><td>{String(submission.condition_code)}</td><td>{new Date(String(submission.submitted_at)).toLocaleString()}</td><td>{duration(submission.completion_seconds)}</td><td>{Number(submission.edit_count)}</td><td>{Number(submission.prompt_length)} words</td><td>{Number(submission.ai_output_length)} words</td><td>{Number(submission.final_output_length)} words</td><td><details><summary>View text</summary><div className={styles.submissionDetail}><h4>Prompts</h4>{prompts.length ? prompts.map((prompt,index)=><pre key={`p-${index}`}>{prompt}</pre>) : <p>None</p>}<h4>AI-generated text</h4>{outputs.length ? outputs.map((output,index)=><pre key={`o-${index}`}>{output}</pre>) : <p>None</p>}<h4>Final reflection</h4><pre>{String(submission.final_reflection)}</pre></div></details></td></tr>;
    }) : <tr><td colSpan={9}>No completed submissions yet.</td></tr>}</tbody></table></div></section>
  </main>;
}
