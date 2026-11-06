# Auraly — controlled reflective-writing study

Auraly is a full-stack Next.js research application for a three-condition, between-subject AI-assisted reflective-writing experiment. Participants use anonymous researcher-issued credentials and are locked to their assigned condition. Researchers use a separate admin role to create accounts, monitor progress, and export data.

## Online access

[Open Auraly](https://auraly-app.vercel.app)

The study application requires researcher-issued credentials. The [four-step design prototype](https://auraly-app.vercel.app/prototype) can be explored separately and does not save responses.

To test all three study conditions, use the login IDs and passwords in [TESTING_ACCOUNTS.txt](TESTING_ACCOUNTS.txt). These are shared demonstration accounts; do not enter personal or sensitive information. Exclude their records from research analysis.

## Study conditions

| Condition | Writing support |
| --- | --- |
| A — General AI Tool | Participants request support through a chat-style input. |
| B — Basic Prompt Construction | Participants build a prompt using topic, context, tone, and writing goal. |
| C — Prompt + Scaffold Construction | Participants build a structured prompt and answer reflective scaffold questions. |

## Technology

Next.js, React, TypeScript, libSQL/SQLite (Turso in production), and server-side AI calls through OpenAI or local Ollama.

## What is recorded

- anonymous participant ID and assigned condition
- start/submission timestamps and completion duration
- structured prompt inputs, exact full prompts, AI responses, and interaction counts
- Condition C scaffold questions and answers
- autosaved draft snapshots and final reflection/word count
- final submission status and writing-process data

Passwords are hashed with bcrypt. Sessions use signed, HTTP-only, same-site cookies. AI and database credentials remain server-side. There are no names or email addresses in the schema.

## Participant access (recommended)

Participants should **not download or install this repository**. Deploy Auraly once to an HTTPS Node.js host, then send each participant:

1. the same HTTPS study URL;
2. their unique anonymous login ID; and
3. their unique password, preferably through a separate secure channel.

The researcher pre-assigns A, B, or C when creating each account. The server enforces the assignment and never shows a condition switcher. All three conditions finish by submitting the final reflection directly; there is no questionnaire step.

## Production data safety

Use a managed libSQL/Turso database by setting `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` on the host. This keeps data independent from ephemeral application storage and supports provider backups. Restrict the database and hosting accounts to the research team, enable MFA, export encrypted backups on a documented schedule, and define retention/deletion dates in the ethics protocol. Never commit `.env*`, database files, exports, or real participant credentials.

Before data collection, run the exact production build through institutional security/privacy review, test all three conditions with test-only accounts, test restore from backup, and verify the AI provider/data-processing terms match participant consent and institutional requirements.

## Running locally

For development or reproduction, see the [local setup guide](docs/LOCAL_SETUP.md).
