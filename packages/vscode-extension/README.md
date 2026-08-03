# ✂️ Prunode VS Code Extension

**Enterprise Cross-Language Dead Code & Blast Radius Engine** directly integrated into your editor.

Prunode brings the power of AST-based dead code detection right into your IDE. It highlights orphaned backend endpoints natively in your source files so you can prune them effortlessly before they ever hit production.

## 🌟 Key Features

- **Real-time Dead Code Squiggles**: Get immediate visual warnings (yellow squiggles) on backend endpoints that are never called by your frontend.
- **Cross-Boundary Analysis**: Works across React/Next.js/Vue frontends and Express/NestJS/FastAPI backends seamlessly.
- **Hover Insights**: Hover over a flagged route to see why it's marked as dead.
- **Zero Configuration**: Just install it in your full-stack repository, and it automatically scans the workspace.
- **Component & Author Tracing**: Detects exactly which component uses which route, and tells you who wrote the orphaned code.

## 🚀 Quick Start

1. Install the extension.
2. Open a full-stack monorepo containing both a frontend and backend.
3. Open any backend API file (`.ts`, `.js`, `.py`).
4. Prunode will automatically flag orphaned routes with a yellow diagnostic warning.

## ⚙️ Configuration

Prunode works out-of-the-box for typical full-stack repositories by statically analyzing your code via AST.

If you have specific directories you want to exclude (like compiled output or third-party vendored code), add a `prunode.json` to the root of your repository:

```json
{
  "ignore": ["node_modules", "dist", ".git", ".next", "coverage"]
}
```

## 📚 Documentation
For deeper dives into how the engine works, visit the main repository at **[github.com/bijanmurmu/prunode](https://github.com/bijanmurmu/prunode)** or read the **[Architecture Documentation](https://github.com/bijanmurmu/prunode/blob/main/ARCHITECTURE.md)** directly.
