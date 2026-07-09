import * as ts from 'typescript';
import { PrunodeGraph } from '../graph';

export function parseFrontendFile(
  filePath: string,
  sourceCode: string,
  graph: PrunodeGraph,
) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
  );

  // UPGRADE #4: Import & Variable Tracing
  // Tracks local constants so if fetch(API_URL) is called, we know what API_URL equals.
  const constants: Record<string, string> = {};
  const axiosInstances: Record<string, string> = {}; // Tracks { identifier: baseURL }

  function extractString(node: ts.Node): string | null {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    if (ts.isTemplateExpression(node)) {
      let fullString = node.head.text;
      for (const span of node.templateSpans) {
        fullString +=
          '${' + span.expression.getText(sourceFile) + '}' + span.literal.text;
      }
      return fullString;
    }
    return null;
  }

  function traverse(node: ts.Node, currentComponent?: string) {
    let componentName = currentComponent;

    // Try to find the component/function name
    if (ts.isFunctionDeclaration(node) && node.name) {
      componentName = node.name.text;
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer))
    ) {
      componentName = node.name.text;
    } else if (ts.isClassDeclaration(node) && node.name) {
      componentName = node.name.text;
    }

    if (ts.isVariableDeclaration(node)) {
      // Track string constants
      if (ts.isIdentifier(node.name) && node.initializer) {
        const val = extractString(node.initializer);
        if (val) {
          constants[node.name.text] = val;
        }
      }

      // Track Axios instances
      if (node.initializer && ts.isCallExpression(node.initializer)) {
        const call = node.initializer;
        if (
          ts.isPropertyAccessExpression(call.expression) &&
          call.expression.expression.getText(sourceFile) === 'axios' &&
          call.expression.name.text === 'create'
        ) {
          const arg = call.arguments[0];
          if (arg && ts.isObjectLiteralExpression(arg)) {
            const baseURLProp = arg.properties.find(
              (p) => p.name && p.name.getText(sourceFile) === 'baseURL',
            ) as ts.PropertyAssignment;
            if (baseURLProp && baseURLProp.initializer) {
              const val = extractString(baseURLProp.initializer);
              if (val && ts.isIdentifier(node.name)) {
                axiosInstances[node.name.text] = val;
              }
            }
          }
        }
      }
    }

    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      // Helper to find expected keys by scanning the parent block for PropertyAccessExpressions
      function findExpectedKeys(callNode: ts.Node): string[] {
        const keys: string[] = [];
        // naive approach: just scan the entire sourceFile for property access like 'data.X' or destructuring
        ts.forEachChild(sourceFile, function visit(child) {
          if (ts.isPropertyAccessExpression(child)) {
            if (ts.isIdentifier(child.name)) {
              keys.push(child.name.text);
            }
          }
          if (
            ts.isVariableDeclaration(child) &&
            ts.isObjectBindingPattern(child.name)
          ) {
            child.name.elements.forEach((el) => {
              if (ts.isIdentifier(el.name)) keys.push(el.name.text);
            });
          }
          ts.forEachChild(child, visit);
        });
        return [...new Set(keys)];
      }

      // fetch(...)
      if (ts.isIdentifier(expression) && expression.text === 'fetch') {
        const firstArg = node.arguments[0];
        if (firstArg) {
          let routeStr = extractString(firstArg);
          if (!routeStr && ts.isIdentifier(firstArg)) {
            routeStr = constants[firstArg.text];
          }
          if (routeStr) {
            const expectedKeys = findExpectedKeys(node);
            graph.addCall({
              method: 'GET',
              path: routeStr,
              sourceFile: filePath,
              expectedKeys,
              componentName,
            });
          }
        }
      }

      // api.get(...) or axios.post(...)
      if (ts.isPropertyAccessExpression(expression)) {
        const methodName = expression.name.text;
        if (['get', 'post', 'put', 'delete', 'patch'].includes(methodName)) {
          const firstArg = node.arguments[0];
          const secondArg = node.arguments[1];

          if (
            secondArg &&
            (ts.isArrowFunction(secondArg) ||
              ts.isFunctionExpression(secondArg))
          ) {
            return; // often a callback, avoid misparsing
          }

          if (firstArg) {
            let routeStr = extractString(firstArg);
            if (!routeStr && ts.isIdentifier(firstArg)) {
              routeStr = constants[firstArg.text];
            }

            // Combine with Axios baseURL if applicable
            if (ts.isIdentifier(expression.expression)) {
              const instanceName = expression.expression.text;
              if (axiosInstances[instanceName]) {
                let base = axiosInstances[instanceName];
                if (base.endsWith('/')) base = base.slice(0, -1);
                if (routeStr && routeStr.startsWith('/')) {
                  routeStr = base + routeStr;
                } else if (routeStr) {
                  routeStr = base + '/' + routeStr;
                }
              }
            }

            if (
              routeStr &&
              (routeStr.startsWith('/') || routeStr.startsWith('http'))
            ) {
              const expectedKeys = findExpectedKeys(node);
              graph.addCall({
                method: methodName.toUpperCase(),
                path: routeStr,
                sourceFile: filePath,
                expectedKeys,
                componentName,
              });
            }
          }
        }
      }

      // WebSocket Support: socket.emit('event', ...)
      if (
        ts.isPropertyAccessExpression(expression) &&
        expression.name.text === 'emit'
      ) {
        if (
          ts.isIdentifier(expression.expression) &&
          expression.expression.text === 'socket'
        ) {
          const arg = node.arguments[0];
          if (arg && ts.isStringLiteral(arg)) {
            graph.addCall({
              method: 'WS',
              path: arg.text,
              sourceFile: filePath,
              expectedKeys: [],
              componentName,
            });
          }
        }
      }
    }

    ts.forEachChild(node, (child) => traverse(child, componentName));
  }
  traverse(sourceFile);
}
