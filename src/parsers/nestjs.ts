import * as ts from 'typescript';
import { PrunodeGraph } from '../graph';

export function parseNestJsFile(filePath: string, sourceCode: string, graph: PrunodeGraph) {
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

    function extractString(node: ts.Node): string | null {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            return node.text;
        }
        return null;
    }

    function traverse(node: ts.Node) {
        if (ts.isClassDeclaration(node)) {
            let basePath = '';
            
            // Check for @Controller
            const classDecorators = ts.getDecorators ? ts.getDecorators(node) : (node as any).decorators;
            if (classDecorators) {
                for (const dec of classDecorators) {
                    if (ts.isCallExpression(dec.expression)) {
                        if (ts.isIdentifier(dec.expression.expression) && dec.expression.expression.text === 'Controller') {
                            const arg = dec.expression.arguments[0];
                            if (arg) {
                                const str = extractString(arg);
                                if (str) basePath = str.startsWith('/') ? str : '/' + str;
                            } else {
                                basePath = '/';
                            }
                        }
                    }
                }
            }

            if (basePath !== '') {
                // Check methods
                for (const member of node.members) {
                    if (ts.isMethodDeclaration(member)) {
                        const methodDecorators = ts.getDecorators ? ts.getDecorators(member) : (member as any).decorators;
                        if (methodDecorators) {
                            for (const mDec of methodDecorators) {
                                if (ts.isCallExpression(mDec.expression)) {
                                    if (ts.isIdentifier(mDec.expression.expression)) {
                                        const methodType = mDec.expression.expression.text;
                                        const allowedMethods = ['Get', 'Post', 'Put', 'Delete', 'Patch'];
                                        
                                        if (allowedMethods.includes(methodType)) {
                                            const arg = mDec.expression.arguments[0];
                                            let routePath = '';
                                            if (arg) {
                                                const str = extractString(arg);
                                                if (str) routePath = str.startsWith('/') ? str : '/' + str;
                                            }
                                            
                                            // combine paths
                                            let finalPath = basePath === '/' ? routePath : basePath + (routePath && routePath !== '/' ? routePath : '');
                                            if (!finalPath) finalPath = '/';

                                            // Try to find return value for payloadKeys
                                            const payloadKeys: string[] = [];
                                            if (member.body) {
                                                ts.forEachChild(member.body, function visit(child) {
                                                    if (ts.isReturnStatement(child) && child.expression && ts.isObjectLiteralExpression(child.expression)) {
                                                        child.expression.properties.forEach(prop => {
                                                            if (prop.name && ts.isIdentifier(prop.name)) {
                                                                payloadKeys.push(prop.name.text);
                                                            }
                                                        });
                                                    }
                                                    ts.forEachChild(child, visit);
                                                });
                                            }

                                            graph.addRoute({
                                                method: methodType.toUpperCase(),
                                                path: finalPath,
                                                sourceFile: filePath,
                                                payloadKeys,
                                                startPos: member.getStart(sourceFile),
                                                endPos: member.getEnd()
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        ts.forEachChild(node, traverse);
    }
    traverse(sourceFile);
}
