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


## Production data safety

Use a managed libSQL/Turso database by setting `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` on the host. This keeps data independent from ephemeral application storage and supports provider backups. Restrict the database and hosting accounts to the research team, enable MFA, export encrypted backups on a documented schedule, and define retention/deletion dates in the ethics protocol. Never commit `.env*`, database files, exports, or participant credentials.

Before data collection, run the exact production build through institutional security/privacy review, test all three conditions with test-only accounts, test restore from backup, and verify the AI provider/data-processing terms match participant consent and institutional requirements.
