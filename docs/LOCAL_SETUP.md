# Local setup

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

   Paste the generated string into `AUTH_SECRET`, choose an `ADMIN_PASSWORD` of at least 12 characters, and configure one AI provider. For OpenAI, set `AI_PROVIDER=openai` and add the server-side `OPENAI_API_KEY`. For local Ollama, set `AI_PROVIDER=ollama`, start Ollama, and pull the configured model first.

5. Create/update the admin account and database:

   ```bash
   mkdir -p research-data
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

[Back to the project overview](../README.md)
