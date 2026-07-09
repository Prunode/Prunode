import * as ts from 'typescript';
import { PrunodeGraph } from '../graph';

export function parseBackendFile(filePath: string, sourceCode: string, graph: PrunodeGraph) {
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

    function traverse(node: ts.Node) {
        if (ts.isCallExpression(node)) {
            const expression = node.expression;
            if (ts.isPropertyAccessExpression(expression)) {
                const methodName = expression.name.text;

                if (['get', 'post', 'put', 'delete', 'patch'].includes(methodName)) {
                    const firstArg = node.arguments[0];
                    const secondArg = node.arguments[1]; // Route definitions almost always have a callback function

                    if (firstArg && ts.isStringLiteral(firstArg) && firstArg.text.startsWith('/')) {
                        // If it has a second argument (the route handler), it's a backend route.
                        if (secondArg) {
                            
                            // UPGRADE #3: Payload "Blast Radius" Tracking
                            const payloadKeys: string[] = [];
                            ts.forEachChild(secondArg, function visit(child) {
                                if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression)) {
                                    if (child.expression.name.text === 'json' || child.expression.name.text === 'send') {
                                        const payload = child.arguments[0];
                                        if (payload && ts.isObjectLiteralExpression(payload)) {
                                            payload.properties.forEach(prop => {
                                                if (prop.name && ts.isIdentifier(prop.name)) {
                                                    payloadKeys.push(prop.name.text);
                                                }
                                            });
                                        }
                                    }
                                }
                                ts.forEachChild(child, visit);
                            });

                            graph.addRoute({
                                method: methodName.toUpperCase(),
                                path: firstArg.text,
                                sourceFile: filePath,
                                payloadKeys: payloadKeys,
                                startPos: node.getStart(sourceFile),
                                endPos: node.getEnd()
                            });
                        }
                    }
                }
            }

            // WebSocket Support: socket.on('event', ...)
            if (ts.isPropertyAccessExpression(expression) && expression.name.text === 'on') {
                if (ts.isIdentifier(expression.expression) && expression.expression.text === 'socket') {
                    const arg = node.arguments[0];
                    if (arg && ts.isStringLiteral(arg)) {
                        graph.addRoute({
                            method: 'WS',
                            path: arg.text,
                            sourceFile: filePath,
                            payloadKeys: [],
                            startPos: node.parent.getStart(sourceFile),
                            endPos: node.parent.getEnd()
                        });
                    }
                }
            }
        }
        ts.forEachChild(node, traverse);
    }
    traverse(sourceFile);
}
