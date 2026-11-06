# Auraly — controlled reflective-writing study

Auraly is a full-stack Next.js research application for a three-condition, between-subject AI-assisted reflective-writing experiment. Participants use anonymous researcher-issued credentials and are locked to their assigned condition. Researchers use a separate admin role to create accounts, monitor progress, and export data.

## What is recorded

- anonymous participant ID and assigned condition
- start/submission timestamps and completion duration
- structured prompt inputs, exact full prompts, AI responses, and interaction counts
- Condition C scaffold questions and answers
- autosaved draft snapshots and final reflection/word count
- final submission status and writing-process data

Passwords are hashed with bcrypt. Sessions use signed, HTTP-only, same-site cookies. AI and database credentials remain server-side. There are no names or email addresses in the schema.

## Local setup in VS Code

Requirements: Node.js 20.9+ and VS Code.

1. Open the `Auraly-app` folder in VS Code.
2. Open **Terminal → New Terminal**.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env.local`, generate an auth secret, and set the values:

   ```bash
   cp .env.example .env.local
   openssl rand -base64 32
   ```

   Paste the generated string into `AUTH_SECRET`, choose a strong `ADMIN_PASSWORD`, and configure one AI provider. For OpenAI, set `AI_PROVIDER=openai` and add the server-side `OPENAI_API_KEY`. For local Ollama, set `AI_PROVIDER=ollama`, start Ollama, and pull the configured model first.

5. Create/update the admin account and database:

   ```bash
   npm run setup
   ```

   The setup command automatically loads the values from `.env.local`.

6. Run development mode:

   ```bash
   npm run dev
   ```

7. Open <http://localhost:3000>. Sign in using `ADMIN_LOGIN_ID` and `ADMIN_PASSWORD` from `.env.local`.

For a local production check:

```bash
npm run build
npm run start
```

## Participant access (recommended)

Participants should **not download or install this repository**. Deploy Auraly once to an HTTPS Node.js host, then send each participant:

1. the same HTTPS study URL;
2. their unique anonymous login ID; and
3. their unique password, preferably through a separate secure channel.

The researcher pre-assigns A, B, or C when creating each account. The server enforces the assignment and never shows a condition switcher. All three conditions finish by submitting the final reflection directly; there is no questionnaire step.

## Production data safety

Use a managed libSQL/Turso database by setting `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` on the host. This keeps data independent from ephemeral application storage and supports provider backups. Restrict the database and hosting accounts to the research team, enable MFA, export encrypted backups on a documented schedule, and define retention/deletion dates in the ethics protocol. Never commit `.env*`, database files, exports, or participant credentials.

Before data collection, run the exact production build through institutional security/privacy review, test all three conditions with test-only accounts, test restore from backup, and verify the AI provider/data-processing terms match participant consent and institutional requirements.
