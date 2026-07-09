import * as ts from 'typescript';
import * as path from 'path';
import { PrunodeGraph } from '../graph';

export function parseNextJsRoute(
  filePath: string,
  sourceCode: string,
  graph: PrunodeGraph,
  baseDir: string,
) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
  );

  // Normalize path for Windows compatibility
  const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
  let routePath = '';

  if (relativePath.includes('app/api/')) {
    routePath =
      '/api/' +
      relativePath
        .split('app/api/')[1]
        .replace('/route.ts', '')
        .replace('/route.js', '');
  } else if (relativePath.includes('pages/api/')) {
    routePath =
      '/api/' +
      relativePath
        .split('pages/api/')[1]
        .replace('.ts', '')
        .replace('.js', '')
        .replace('/index', '');
  } else {
    return; // Not a Next.js API route
  }

  // Convert Next.js dynamic segments [id] to Express style :id for the resolver
  routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');
  // Ensure trailing slash is removed if empty
  if (routePath.endsWith('/')) {
    routePath = routePath.slice(0, -1);
  }

  function traverse(node: ts.Node) {
    // App Router: export async function GET()
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const methodName = node.name.text;
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(methodName)) {
        graph.addRoute({
          method: methodName,
          path: routePath,
          sourceFile: filePath,
          payloadKeys: [], // Next.js payload tracking can be added later
        });
      }
    }
    ts.forEachChild(node, traverse);
  }
  traverse(sourceFile);
}
