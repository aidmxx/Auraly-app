import { db, words } from "../lib/db";

const write = process.argv.includes("--write");

const stringArray = (value: unknown) => {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

async function main() {
const submissions = (await db().execute(`
  SELECT s.id,u.login_id,s.prompt_length,s.ai_output_length,s.final_output_length,
         s.prompts_json,s.ai_outputs_json,s.final_reflection
  FROM submissions s JOIN users u ON u.id=s.participant_id
`)).rows;
const studies = (await db().execute(`
  SELECT id,final_word_count,final_reflection FROM studies
`)).rows;
const drafts = (await db().execute(`
  SELECT id,word_count,content FROM drafts
`)).rows;

const submissionChanges = submissions.map((row) => {
  const promptLength = stringArray(row.prompts_json).reduce((sum, text) => sum + words(text), 0);
  const aiOutputLength = stringArray(row.ai_outputs_json).reduce((sum, text) => sum + words(text), 0);
  const finalOutputLength = words(String(row.final_reflection ?? ""));
  return {
    id: String(row.id),
    loginId: String(row.login_id),
    before: [Number(row.prompt_length), Number(row.ai_output_length), Number(row.final_output_length)],
    after: [promptLength, aiOutputLength, finalOutputLength],
  };
}).filter(({ before, after }) => before.some((value, index) => value !== after[index]));

const studyChanges = studies.map((row) => ({
  id: String(row.id),
  before: Number(row.final_word_count),
  after: words(String(row.final_reflection ?? "")),
})).filter(({ before, after }) => before !== after);

const draftChanges = drafts.map((row) => ({
  id: String(row.id),
  before: Number(row.word_count),
  after: words(String(row.content ?? "")),
})).filter(({ before, after }) => before !== after);

const ptest13 = submissionChanges
  .filter(({ loginId }) => loginId === "PTEST13")
  .map(({ before, after }) => ({ before, after }));

console.log(JSON.stringify({
  mode: write ? "write" : "dry-run",
  scanned: { submissions: submissions.length, studies: studies.length, drafts: drafts.length },
  changes: { submissions: submissionChanges.length, studies: studyChanges.length, drafts: draftChanges.length },
  ptest13,
}, null, 2));

if (!write) {
  console.log("Dry run only. Re-run with --write to persist these recalculated values.");
  process.exit(0);
}

const statements = [
  ...submissionChanges.map(({ id, after }) => ({
    sql: "UPDATE submissions SET prompt_length=?,ai_output_length=?,final_output_length=? WHERE id=?",
    args: [...after, id],
  })),
  ...studyChanges.map(({ id, after }) => ({
    sql: "UPDATE studies SET final_word_count=? WHERE id=?",
    args: [after, id],
  })),
  ...draftChanges.map(({ id, after }) => ({
    sql: "UPDATE drafts SET word_count=? WHERE id=?",
    args: [after, id],
  })),
];

if (statements.length) await db().batch(statements, "write");

const verification = (await db().execute(`
  SELECT u.login_id,s.submitted_at,s.prompt_length,s.ai_output_length,s.final_output_length
  FROM submissions s JOIN users u ON u.id=s.participant_id
  WHERE u.login_id='PTEST13' ORDER BY s.submitted_at
`)).rows;
console.log(JSON.stringify({ persisted: statements.length, verification }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
