# Changelog

All notable changes to the Prunode Core Engine and VS Code Extension will be documented in this file.

## [1.0.0] - Initial Release
### Added
- **Core Engine Integration**: Full integration of the Prunode AST directed-graph engine.
- **Auto-Fix Pruning (`--prune`)**: The CLI can now automatically slice dead backend code out of your source files.
- **Visual Architecture Graph (`--html`)**: Generates an interactive, standalone D3/Cytoscape HTML file visualizing your entire frontend and backend node graph.
- **Interactive Local Dashboard**: Run `prunode serve .` to launch a local React-style web dashboard on `localhost:3000` with live metric cards and your interactive node graph!
- **Runtime Telemetry Middleware**: Exported `prunodeTelemetry()` middleware tracks real-world production traffic. Flags endpoints as *"Statically Active but Runtime Dead"*.
- **Automated GitHub PR Bot**: Included GitHub Actions workflow (`.github/workflows/prunode-bot.yml`) that automatically comments on Pull Requests if they introduce dead code!
- **VS Code Extension Quick Fix**: The editor extension now provides a native Quick Fix (`Cmd + .`) to instantly auto-delete dead endpoints.
- **Diagnostic Highlighting**: Implemented real-time yellow squiggle warnings for completely orphaned backend routes.
- **Git Blame Integration**: Automatically traces orphaned endpoints back to their Git author.
- **Frontend Component Tracing**: Identifies exactly which React/Vue UI components use each API endpoint.
- **Payload Blast Radius**: Tracks expected JSON keys on the frontend and calculates "Dead Fields" (over-fetching).
- **WebSocket Event Tracing**: AST parses `socket.on()` and `socket.emit()` to flag Dead WebSocket Listeners.
- **Multi-Language Support**: AST parsing support for TypeScript/JavaScript (Express, NestJS, Next.js) and a native Python (`FastAPI`) parser, making the engine truly cross-language.
- **SARIF Integration**: Added `--sarif` flag for GitHub Advanced Security and CI/CD blocking.
