import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('prunode');
    context.subscriptions.push(diagnosticCollection);

    let disposable = vscode.commands.registerCommand('prunode.scan', () => {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('Prunode requires an open workspace.');
            return;
        }

        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        vscode.window.showInformationMessage('Prunode: Scanning for dead endpoints...');

        exec('prunode scan . --sarif', { cwd: workspacePath }, (error, stdout, stderr) => {
            const sarifPath = path.join(workspacePath, 'prunode-results.sarif');
            
            if (!fs.existsSync(sarifPath)) {
                vscode.window.showErrorMessage('Prunode: SARIF file not found. Ensure prunode is installed globally.');
                return;
            }

            const sarifData = JSON.parse(fs.readFileSync(sarifPath, 'utf8'));
            diagnosticCollection.clear();

            const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();

            for (const run of sarifData.runs) {
                if (!run.results) continue;

                for (const result of run.results) {
                    for (const loc of result.locations) {
                        const fileUri = vscode.Uri.file(path.join(workspacePath, loc.physicalLocation.artifactLocation.uri));
                        
                        // We put squiggly line on line 1 for simplicity, or try to find the route method
                        const range = new vscode.Range(0, 0, 0, 100);
                        const diagnostic = new vscode.Diagnostic(range, result.message.text, vscode.DiagnosticSeverity.Warning);
                        
                        const uriStr = fileUri.toString();
                        if (!diagnosticsMap.has(uriStr)) diagnosticsMap.set(uriStr, []);
                        diagnosticsMap.get(uriStr)?.push(diagnostic);
                    }
                }
            }

            for (const [uriStr, diags] of diagnosticsMap.entries()) {
                diagnosticCollection.set(vscode.Uri.parse(uriStr), diags);
            }

            vscode.window.showInformationMessage(`Prunode: Found ${sarifData.runs[0].results?.length || 0} orphaned endpoints.`);
        });
    });

    context.subscriptions.push(disposable);

    // AI Quick Fix Provider
    const quickFixProvider = vscode.languages.registerCodeActionsProvider(
        { scheme: 'file' },
        {
            provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken) {
                const prunodeDiagnostics = context.diagnostics.filter(d => d.message.includes('Dead Backend Endpoint'));
                if (prunodeDiagnostics.length === 0) return [];

                const fix = new vscode.CodeAction('✂️ Prunode: Auto-Delete Dead Endpoint & Generate PR', vscode.CodeActionKind.QuickFix);
                fix.isPreferred = true;
                
                // We use a command to execute the fix rather than raw workspace edits, as Prunode CLI does it best
                fix.command = {
                    command: 'prunode.prune',
                    title: 'Prunode: Prune code'
                };
                
                return [fix];
            }
        }
    );
    
    let pruneDisposable = vscode.commands.registerCommand('prunode.prune', () => {
        if (!vscode.workspace.workspaceFolders) return;
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        
        vscode.window.showInformationMessage('Prunode: Intelligently pruning dead code & imports...');
        
        exec('prunode scan . --prune', { cwd: workspacePath }, (error, stdout) => {
            vscode.window.showInformationMessage('Prunode: Cleaned up dead code successfully!');
            vscode.commands.executeCommand('prunode.scan'); // rescan to clear squiggles
        });
    });

    context.subscriptions.push(quickFixProvider, pruneDisposable);
}

export function deactivate() {}
