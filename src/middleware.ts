import * as fs from 'fs';
import * as path from 'path';

const TELEMETRY_FILE = path.resolve(process.cwd(), 'prunode-telemetry.json');
let hitRoutes = new Set<string>();

// Try to load existing telemetry
if (fs.existsSync(TELEMETRY_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf8'));
        hitRoutes = new Set(data.hitRoutes || []);
    } catch (e) {}
}

/**
 * Prunode Runtime Telemetry Middleware for Express.
 * Tracks real-world endpoint usage to find "Statically Active but Runtime Dead" code.
 */
export function prunodeTelemetry() {
    return (req: any, res: any, next: any) => {
        // We capture the normalized route pattern if available (e.g. /users/:id)
        // Express usually attaches req.route.path after routing, so we hook into res.on('finish')
        res.on('finish', () => {
            const routePath = req.route ? req.route.path : req.path;
            const method = req.method.toUpperCase();
            const id = `${method} ${routePath}`;
            
            if (!hitRoutes.has(id)) {
                hitRoutes.add(id);
                // Persist asynchronously to avoid blocking the main thread
                fs.writeFile(TELEMETRY_FILE, JSON.stringify({ hitRoutes: Array.from(hitRoutes) }, null, 2), () => {});
            }
        });
        next();
    };
}
