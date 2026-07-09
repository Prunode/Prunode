import * as ts from 'typescript';

function main() {
    console.log("Initializing Prunode Parser Engine (Native TypeScript AST)...");

    const sourceCode = `
import express from 'express';
const app = express();

// An active route
app.get('/api/v1/users', (req, res) => {
    res.json({ users: [{ id: 1, name: 'Alice' }] });
});

// A legacy route that might be dead code!
app.post('/api/v1/legacy-auth', (req, res) => {
    res.json({ token: '123' });
});

app.listen(3000);
    `;

    // 1. Parse the AST using the official TypeScript Compiler API
    const sourceFile = ts.createSourceFile(
        'backend.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
    );
    console.log("✅ AST Successfully Generated in Memory!");

    console.log("\n🔍 Scanning AST for Backend Endpoints...");
    const extractedRoutes: Array<{ method: string, route: string }> = [];

    // 2. Traverse the AST to find Express route definitions
    function traverse(node: ts.Node) {
        if (ts.isCallExpression(node)) {
            const expression = node.expression;
            
            // Look for things like `app.get`
            if (ts.isPropertyAccessExpression(expression)) {
                const objectName = expression.expression.getText(sourceFile);
                const methodName = expression.name.text;

                if (objectName === 'app' && ['get', 'post', 'put', 'delete', 'patch'].includes(methodName)) {
                    // Extract the route string (e.g., '/api/v1/users')
                    const firstArg = node.arguments[0];
                    if (firstArg && ts.isStringLiteral(firstArg)) {
                        extractedRoutes.push({
                            method: methodName.toUpperCase(),
                            route: firstArg.text
                        });
                    }
                }
            }
        }
        
        // Recursively walk through all children in the tree
        ts.forEachChild(node, traverse);
    }

    traverse(sourceFile);

    if (extractedRoutes.length === 0) {
        console.log("No routes found.");
        return;
    }

    extractedRoutes.forEach(r => {
        console.log(`  🟢 Found Backend Endpoint: [${r.method}] ${r.route}`);
    });

    console.log("\n🚀 Success! The AST engine is fully functional.");
    console.log("🚀 Next Step: Diff these routes against frontend fetch() calls to find dead code!");
}

main();
