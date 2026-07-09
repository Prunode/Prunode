<div align="center">
  <img src="./vscode-extension/icon.svg" alt="Prunode Logo" width="150" height="150">
  <h1>Prunode</h1>
</div>


**Cross-Language Dead Code & Blast Radius Engine**

Prunode uses Native AST Compilers to map API requests between your frontend and backend. It automatically flags orphaned backend endpoints and integrates with CI/CD pipelines.

## 🌟 Core Features

- 🌉 **Cross-Boundary Analysis**: Reads your React/Next.js frontend and maps it against your Express/NestJS/FastAPI backend.
- 📈 **Interactive Local Dashboard**: Run `prunode serve .` to launch a local React-style web dashboard on `localhost:3000` with live metric cards and your interactive node graph!
- 🤖 **Automated GitHub PR Bot**: Included GitHub Actions workflow (`.github/workflows/prunode-bot.yml`) that automatically comments on Pull Requests if they introduce dead code!
- 📡 **Runtime Telemetry Middleware**: Exported `prunodeTelemetry()` middleware tracks real-world production traffic. Flags endpoints as *"Statically Active but Runtime Dead"*.
- 💡 **VS Code "Quick Fix"**: Hover over a dead endpoint squiggle in your editor and hit `Cmd + .` to instantly auto-delete it.
- 🕸️ **Visual Architecture Graph**: Run with `--html` to generate an interactive Cytoscape.js 3D node graph of your entire system.
- 🔌 **WebSocket Tracing**: Maps `socket.emit('EVENT')` to `socket.on('EVENT')`. Flags dead WebSocket listeners.
- 🐍 **Multi-Language Support**: Supports TypeScript/JavaScript natively, and now parses Python (FastAPI) out-of-the-box.
- 🗑️ **Auto-Fix Pruning**: Run `prunode scan . --prune` to automatically delete dead endpoints directly from your source files.
- 🧑‍💻 **Git Blame Integration**: Automatically traces dead code back to the author who wrote it using Git.
- ⚛️ **Frontend Component Tracing**: Identifies exactly which UI component uses each active endpoint.
- 💥 **Payload Blast Radius**: Detects "Over-fetching" (JSON fields sent by the backend that the frontend never reads).
- 🛡️ **CI/CD Native**: Fail builds when dead code is introduced. Includes `--sarif` for GitHub Advanced Security.
- **High Performance:** Fully asynchronous file walking.

## 🚀 Quick Start
Install globally:
```bash
npm install -g prunode
```

**Run a Basic Scan (Current Directory):**
```bash
prunode scan .
```

**Scan a Specific Directory:**
```bash
prunode scan /path/to/your/project
```

**Launch the Interactive Web Dashboard:**
```bash
prunode serve .
```

**Auto-Fix: Intelligently Delete Dead Code:**
```bash
prunode scan . --prune
```

**Generate a Visual Architecture Graph (HTML):**
```bash
prunode scan . --html
```

**Generate SARIF Report (For GitHub Advanced Security):**
```bash
prunode scan . --sarif
```


## Configuration
Add a `prunode.json` to the root of your repository to ignore specific directories:
```json
{
  "ignore": ["node_modules", "dist", ".git", ".next", "coverage"]
}
```

## Documentation
- [Architecture](./ARCHITECTURE.md)
- [Contributing](./CONTRIBUTING.md)
