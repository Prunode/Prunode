# 🏛️ Prunode Architecture

Prunode is a fast, semantic static analysis engine. The pipeline operates in three phases:

## 1. Asynchronous File Walking
Prunode crawls repositories using concurrent `fs.promises` directory mapping. It parses `prunode.json` to eagerly drop ignored folders (e.g., `node_modules`), reducing I/O overhead.

## 2. Semantic AST Parsing
Uses the Native TypeScript Compiler API (`ts.createSourceFile`) to generate Abstract Syntax Trees (AST).
- **Frontend Parser**: (`src/parsers/frontend.ts`) Traverses React, Vue, Next.js looking for `fetch()` or `axios`. It resolves dynamic variables, tracks base URLs, and captures the **Component Name** making the call.
- **Backend Parsers**: (`src/parsers/backend.ts`, `nestjs.ts`, `fastapi.ts`) Captures route definitions and their exact byte positions (`startPos`, `endPos`) from Express, NestJS, and Python FastAPI.
- **Graph Resolver**: (`src/graph.ts`) Compares APIs using normalized routes. Performs Payload Blast Radius checks.
- **CLI Engine**: (`src/index.ts`) Renders the output, runs `git blame` for orphaned routes, and executes the Auto-Fix pruning logic if `--prune` is passed.

## 3. Directed Graph Resolution
The `PrunodeGraph` normalizes dynamic frontend template literals (`` fetch(`/api/${id}`) ``) to match backend dynamic routing keys (`/api/:id`). It connects the graph and flags completely disconnected backend nodes as **ORPHAN**.

## SARIF & CI Enforcements
If `--sarif` is passed, Prunode generates a `prunode-results.sarif` file for CodeQL/GitHub Advanced Security. If run in CI without `--sarif`, dead endpoints cause a hard `process.exit(1)` failure.
