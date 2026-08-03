# Changelog

All notable changes to the Prunode Core Engine and VS Code Extension will be documented in this file.

## 1.0.0 (2026-08-03)


### Bug Fixes

* update workflow paths to use packages directory ([b5a9187](https://github.com/Prunode/Prunode/commit/b5a9187ef0f2ff997fcf72027032610c2cbec0e1))

## [1.0.0] - Initial Release
### Added
- **Community Standards**: Added `CODE_OF_CONDUCT.md` and `SECURITY.md`.
- **Contribution Templates**: Added GitHub Issue templates (Bug, Feature) and Pull Request template.
- **Testing Infrastructure**: Added `vitest` for completely free, fast automated testing.
- **Code Quality**: Set up ESLint and Prettier for code linting and formatting.
- **Automated Releases**: Implemented Release Please workflow for automated versioning and changelog generation.
- **Project Badges**: Added standard status badges to the README.
- **Issue ChatOps**: Added a GitHub Action bot to allow contributors to claim issues using `/assign`.
- **Comprehensive CI Pipeline**: Upgraded Pull Request workflows to automatically verify code formatting, linting, and tests alongside dead-code checks.
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
