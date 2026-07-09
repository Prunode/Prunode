import * as fs from 'fs';
import * as path from 'path';

export interface Route {
    method: string;
    path: string;
    sourceFile: string;
    payloadKeys: string[];
    deadFields?: string[];
    startPos?: number;
    endPos?: number;
    usedByComponents?: string[]; // newly added
}

export interface ApiCall {
    method: string;
    path: string;
    sourceFile: string;
    expectedKeys?: string[];
    componentName?: string;
}

export class PrunodeGraph {
    public routes: Route[] = [];
    public calls: ApiCall[] = [];

    addRoute(route: Route) {
        route.deadFields = [];
        route.usedByComponents = [];
        this.routes.push(route);
    }

    addCall(call: ApiCall) {
        if (!call.expectedKeys) call.expectedKeys = [];
        this.calls.push(call);
    }

    private normalizePath(p: string): string {
        return p.replace(/:[^/]+/g, '*').replace(/\$\{[^}]+\}/g, '*');
    }

    resolve() {
        const deadRoutes: Route[] = [];
        
        for (const route of this.routes) {
            const normalizedBackend = this.normalizePath(route.path);
            let isCalled = false;
            let allExpectedKeys: Set<string> = new Set();

            for (const call of this.calls) {
                const callMethod = call.method === 'UNKNOWN' ? 'GET' : call.method;
                const normalizedFrontend = this.normalizePath(call.path);
                
                if (normalizedFrontend === normalizedBackend && (callMethod === route.method || callMethod === 'ANY')) {
                    isCalled = true;
                    call.expectedKeys?.forEach(k => allExpectedKeys.add(k));
                    if (call.componentName) {
                        route.usedByComponents?.push(call.componentName);
                    }
                }
            }

            if (!isCalled) {
                deadRoutes.push(route);
            } else {
                // Blast Radius validation
                route.deadFields = route.payloadKeys.filter(key => !allExpectedKeys.has(key));
            }
        }
        return deadRoutes;
    }

    generateHTML(): string {
        const nodes: any[] = [];
        const edges: any[] = [];
        const addedNodes = new Set<string>();

        let deadCount = 0;
        this.routes.forEach(r => {
            const id = `${r.method} ${r.path}`;
            const isDead = !this.calls.some(c => this.normalizePath(c.path) === this.normalizePath(r.path));
            if (isDead) deadCount++;
            
            if (!addedNodes.has(id)) {
                nodes.push({ data: { id, label: id, type: 'backend', isDead } });
                addedNodes.add(id);
            }
        });

        this.calls.forEach(c => {
            const compId = c.componentName || c.sourceFile;
            if (!addedNodes.has(compId)) {
                nodes.push({ data: { id: compId, label: c.componentName || 'Frontend', type: 'frontend' } });
                addedNodes.add(compId);
            }
            
            const targetId = `${c.method === 'UNKNOWN' ? 'GET' : c.method} ${c.path}`;
            // If backend node doesn't exist perfectly, we create a ghost node
            const matchedBackend = this.routes.find(r => this.normalizePath(r.path) === this.normalizePath(c.path));
            const finalTargetId = matchedBackend ? `${matchedBackend.method} ${matchedBackend.path}` : targetId;
            
            if (!addedNodes.has(finalTargetId)) {
                nodes.push({ data: { id: finalTargetId, label: finalTargetId, type: 'backend', isDead: false } });
                addedNodes.add(finalTargetId);
            }

            edges.push({ data: { source: compId, target: finalTargetId } });
        });

        const activeCount = this.routes.length - deadCount;
        const callCount = this.calls.length;

        return `<!DOCTYPE html>
<html>
<head>
    <title>Prunode Interactive Dashboard</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.26.0/cytoscape.min.js"></script>
    <style>
        body { background-color: #09090b; margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: white; display: flex; }
        #sidebar { width: 320px; background-color: #18181b; border-right: 1px solid #27272a; padding: 24px; display: flex; flex-direction: column; gap: 24px; z-index: 10; box-shadow: 4px 0 15px rgba(0,0,0,0.5); }
        #cy { flex-grow: 1; height: 100vh; display: block; }
        .metric-card { background: #27272a; padding: 16px; border-radius: 12px; border: 1px solid #3f3f46; }
        .metric-value { font-size: 32px; font-weight: bold; margin-top: 8px; }
        .red { color: #ef4444; }
        .blue { color: #3b82f6; }
        .purple { color: #8b5cf6; }
        h1 { margin: 0; font-size: 24px; display: flex; align-items: center; gap: 8px; }
        h3 { margin: 0; font-size: 14px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; }
    </style>
</head>
<body>
    <div id="sidebar">
        <h1><svg width="24" height="24" viewBox="0 0 256 256" fill="none"><path d="M128 190L128 136" stroke="white" stroke-width="24" stroke-linecap="round"/><path d="M128 136L76 84" stroke="white" stroke-width="24" stroke-linecap="round"/><path d="M172 108L196 84" stroke="#ef4444" stroke-width="24" stroke-linecap="round"/></svg> Prunode</h1>
        <p style="color: #a1a1aa; margin: 0;">Interactive Architecture Dashboard</p>
        
        <div class="metric-card">
            <h3>Dead Endpoints</h3>
            <div class="metric-value red">${deadCount}</div>
        </div>
        <div class="metric-card">
            <h3>Active Endpoints</h3>
            <div class="metric-value blue">${activeCount}</div>
        </div>
        <div class="metric-card">
            <h3>Frontend Calls</h3>
            <div class="metric-value purple">${callCount}</div>
        </div>
        
        <div style="margin-top: auto;">
            <p style="font-size: 12px; color: #71717a;">Run <code>prunode scan . --prune</code> in your terminal to auto-fix the dead endpoints.</p>
        </div>
    </div>
    <div id="cy"></div>
    <script>
        var cy = cytoscape({
            container: document.getElementById('cy'),
            elements: ${JSON.stringify({ nodes, edges })},
            style: [
                {
                    selector: 'node[type="backend"]',
                    style: { 'background-color': '#3b82f6', 'label': 'data(label)', 'color': '#fff', 'text-outline-color': '#000', 'text-outline-width': 2, 'font-size': '12px' }
                },
                {
                    selector: 'node[isDead]',
                    style: { 'background-color': '#ef4444' }
                },
                {
                    selector: 'node[type="frontend"]',
                    style: { 'background-color': '#8b5cf6', 'shape': 'rectangle', 'label': 'data(label)', 'color': '#fff', 'text-outline-color': '#000', 'text-outline-width': 2, 'font-size': '12px' }
                },
                {
                    selector: 'edge',
                    style: { 'width': 2, 'line-color': '#555', 'target-arrow-color': '#555', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' }
                }
            ],
            layout: { name: 'cose', padding: 50 }
        });
    </script>
</body>
</html>`;
    }
}
