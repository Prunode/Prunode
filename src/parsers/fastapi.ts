import * as fs from 'fs';
import { PrunodeGraph } from '../graph';

// MVP: Regex based parsing for FastAPI since we don't have Python AST parser in TS
export function parseFastAPIFile(filePath: string, graph: PrunodeGraph) {
  const code = fs.readFileSync(filePath, 'utf-8');

  // Match @app.get("/users") or @router.post('/api/data')
  const routeRegex =
    /@(app|router)\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g;

  let match;
  while ((match = routeRegex.exec(code)) !== null) {
    const method = match[2].toUpperCase();
    const path = match[3];

    // Find the end of the python function to approximate startPos/endPos
    const startPos = match.index;
    // Naive approximation: find the next empty line or next decorator
    const nextDecoratorIndex = code.indexOf('@', startPos + 1);
    const endPos = nextDecoratorIndex > -1 ? nextDecoratorIndex : code.length;

    // Try to find a simple return statement to extract payload keys
    const funcBlock = code.substring(startPos, endPos);
    const payloadKeys: string[] = [];
    const returnMatch = funcBlock.match(/return\s+{([^}]+)}/);
    if (returnMatch) {
      const keysStr = returnMatch[1];
      const keys = keysStr
        .split(',')
        .map((s) => {
          const k = s.split(':')[0].trim().replace(/['"]/g, '');
          return k;
        })
        .filter((k) => k);
      payloadKeys.push(...keys);
    }

    graph.addRoute({
      method,
      path,
      sourceFile: filePath,
      payloadKeys,
      startPos,
      endPos,
    });
  }
}
