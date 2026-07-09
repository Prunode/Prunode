# 🤝 Contributing to Prunode

We welcome contributions to extend Prunode's framework and language support!

## 🙋 Claiming an Issue
If you find an open issue you would like to work on, simply leave a comment with **`/assign`**. Our GitHub bot will automatically assign the issue to you so others know you are working on it!

## Local Setup
1. Clone the repository and run `npm install`.
2. Build the project: `npm run build`.
3. Test the interactive CLI mode:
   ```bash
   npx tsx src/index.ts
   ```
4. Test a direct scan using the sandbox: 
   ```bash
   npx tsx src/index.ts scan test-sandbox
   ```

## Adding a New Parser
To support a new framework (e.g., FastAPI, Go Fiber):
1. **Create a Parser:** Add a new file in `src/parsers/` (e.g., `fastapi.ts`).
2. **Implement AST Logic:** Parse the file and extract the `method` (GET, POST), `path` (endpoint URL), and optional `payloadKeys`.
3. **Register Route:** Inject the endpoint into the global graph:
   ```typescript
   graph.addRoute({ method: 'GET', path: '/api/v1/users', sourceFile: 'main.py', payloadKeys: [] });
   ```
4. **Wire It Up:** Update `src/index.ts` to invoke your parser on the correct file extensions.

## Submitting Pull Requests
- Ensure `npm run build` succeeds without TS errors.
- Ensure existing tests and sandboxes map correctly (0 exit code for active endpoints).
