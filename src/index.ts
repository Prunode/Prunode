#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as http from 'http';
import Table from 'cli-table3';
import * as readline from 'readline';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import { PrunodeGraph } from './graph';
import { parseBackendFile } from './parsers/backend';
import { parseFrontendFile } from './parsers/frontend';
import { parseNextJsRoute } from './parsers/nextjs';
import { parseNestJsFile } from './parsers/nestjs';
import { parseFastAPIFile } from './parsers/fastapi';
import { execSync } from 'child_process';

const program = new Command();

program
  .name('prunode')
  .description('Cross-Language Dead Code & Blast Radius Engine')
  .version('1.0.0');

async function runScanner(dir: string, options: any = {}) {
    const scanDir = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(scanDir)) {
      console.error(chalk.red(`\n❌ Directory not found: ${scanDir}`));
      process.exit(1);
    }

    // Only print logo if we are running the explicit scan command
    // (Interactive mode already prints it before the prompt)
    if (process.argv.includes('scan')) {
        console.log(chalk.cyanBright.bold(`
┏━┓┏━┓╻ ╻┏┓╻┏━┓╺┳┓┏━╸
┣━┛┣┳┛┃ ┃┃┗┫┃ ┃ ┃┃┣╸ 
╹  ╹┗╸┗━┛╹ ╹┗━┛╺┻┛┗━╸
        `));
        console.log(chalk.gray.italic(`      Enterprise Cross-Boundary Resolution Engine\n`));
    }

    let config = { ignore: ['node_modules', 'dist', '.git', '.next'] };
    const configPath = path.join(scanDir, 'prunode.json');
    if (fs.existsSync(configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.ignore = [...config.ignore, ...(userConfig.ignore || [])];
        console.log(chalk.yellow(`[⚙️] Loaded custom configuration from prunode.json`));
    }

    console.log(chalk.blueBright(`\n[1/3] Scanning Monorepo: `) + chalk.white(scanDir));

    const graph = new PrunodeGraph();

    async function getFiles(currentDir: string): Promise<string[]> {
        const dirents = await fsPromises.readdir(currentDir, { withFileTypes: true });
        const files = await Promise.all(dirents.map(async (dirent) => {
            const res = path.resolve(currentDir, dirent.name);
            if (config.ignore.some(ignored => res.includes(ignored))) return [];
            return dirent.isDirectory() ? getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
    }

    const allFiles = await getFiles(scanDir);
    
    await Promise.all(allFiles.map(async (fullPath) => {
        const ext = path.extname(fullPath);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            const content = await fsPromises.readFile(fullPath, 'utf8');
            
            if (fullPath.replace(/\\/g, '/').includes('/api/')) {
                parseNextJsRoute(fullPath, content, graph, scanDir);
            } else {
                parseBackendFile(fullPath, content, graph);
                parseNestJsFile(fullPath, content, graph);
            }
            
            parseFrontendFile(fullPath, content, graph);
        } else if (ext === '.py') {
            parseFastAPIFile(fullPath, graph);
        }
    }));

    console.log(chalk.blueBright(`[2/3] AST Compilation Complete. `) + chalk.gray(`Found ${graph.routes.length} backend endpoints, ${graph.calls.length} frontend queries.`));
    console.log(chalk.blueBright(`[3/3] Resolving SCIP Directed Graph...\n`));

    const deadRoutes = graph.resolve();
    const activeRoutes = graph.routes.filter(r => !deadRoutes.includes(r));

    if (options.sarif) {
        const sarifOutput = {
            version: '2.1.0',
            $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
            runs: [{
                tool: {
                    driver: { name: 'Prunode', version: '1.0.0' }
                },
                results: deadRoutes.map(r => ({
                    ruleId: 'PRUNODE-001',
                    message: { text: `Dead Backend Endpoint: [${r.method}] ${r.path}` },
                    locations: [{
                        physicalLocation: {
                            artifactLocation: { uri: path.relative(process.cwd(), r.sourceFile) }
                        }
                    }]
                }))
            }]
        };
        const sarifPath = path.resolve(process.cwd(), 'prunode-results.sarif');
        fs.writeFileSync(sarifPath, JSON.stringify(sarifOutput, null, 2));
        console.log(chalk.green(`\n✅ SARIF report written to ${chalk.bold.white(sarifPath)}`));
        return; // Skip console table in SARIF mode
    }

    if (options.html) {
        const htmlPath = path.resolve(process.cwd(), 'prunode-graph.html');
        fs.writeFileSync(htmlPath, graph.generateHTML());
        console.log(chalk.green(`\n✅ Interactive Architecture Graph written to ${chalk.bold.white(htmlPath)}`));
        console.log(chalk.gray(`   Open it in your browser to explore your endpoints.`));
    }

    if (options.prune && deadRoutes.length > 0) {
        console.log(chalk.yellowBright(`\n[!] Auto-Fix triggered. Pruning ${deadRoutes.length} dead endpoints...`));
        const grouped = new Map<string, typeof deadRoutes>();
        for (const r of deadRoutes) {
            if (!grouped.has(r.sourceFile)) grouped.set(r.sourceFile, []);
            grouped.get(r.sourceFile)!.push(r);
        }
        for (const [file, routes] of grouped.entries()) {
            let content = fs.readFileSync(file, 'utf8');
            routes.sort((a, b) => (b.startPos || 0) - (a.startPos || 0));
            for (const r of routes) {
                if (r.startPos !== undefined && r.endPos !== undefined) {
                    content = content.substring(0, r.startPos) + content.substring(r.endPos);
                }
            }
            fs.writeFileSync(file, content, 'utf8');
        }
        console.log(chalk.green(`\n✅ PRUNED: Automatically deleted ${deadRoutes.length} dead endpoints!`));
        return;
    }

    let hitRoutes = new Set<string>();
    const telemetryPath = path.resolve(process.cwd(), 'prunode-telemetry.json');
    let useTelemetry = false;
    if (fs.existsSync(telemetryPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(telemetryPath, 'utf8'));
            hitRoutes = new Set(data.hitRoutes || []);
            useTelemetry = true;
        } catch(e) {}
    }

    const table = new Table({
        head: [chalk.bold.white('Method'), chalk.bold.white('Endpoint Route'), chalk.bold.white('Payload Schema'), chalk.bold.white('Dead Fields'), chalk.bold.white('Components'), chalk.bold.white('Author'), chalk.bold.white('Status')],
        style: { head: [], border: ['gray'] }
    });

    let totalDeadFields = 0;
    let runtimeDead = 0;

    activeRoutes.forEach(r => {
        const payloadStr = r.payloadKeys.length > 0 ? chalk.cyan(`{ ${r.payloadKeys.join(', ')} }`) : chalk.gray('{}');
        const deadFieldsStr = r.deadFields && r.deadFields.length > 0 ? chalk.yellow(`{ ${r.deadFields.join(', ')} }`) : chalk.gray('-');
        const componentsStr = r.usedByComponents && r.usedByComponents.length > 0 ? chalk.magenta([...new Set(r.usedByComponents)].join(', ')) : chalk.gray('-');
        if (r.deadFields && r.deadFields.length > 0) totalDeadFields += r.deadFields.length;
        
        let status = chalk.green('ACTIVE');
        if (useTelemetry) {
            const id = `${r.method} ${r.path}`;
            if (!hitRoutes.has(id)) {
                status = chalk.yellow('RUNTIME DEAD');
                runtimeDead++;
            }
        }
        
        table.push([ chalk.greenBright(r.method), chalk.white(r.path), payloadStr, deadFieldsStr, componentsStr, chalk.gray('-'), status ]);
    });

    deadRoutes.forEach(r => {
        const payloadStr = r.payloadKeys.length > 0 ? chalk.cyan(`{ ${r.payloadKeys.join(', ')} }`) : chalk.gray('{}');
        let author = '-';
        if (r.startPos !== undefined) {
            try {
                const content = fs.readFileSync(r.sourceFile, 'utf8');
                const lineNum = content.substring(0, r.startPos).split('\n').length;
                const blame = execSync(`git blame -L ${lineNum},${lineNum} --porcelain ${r.sourceFile}`, { stdio: 'pipe' }).toString();
                const authorMatch = blame.match(/^author (.+)/m);
                if (authorMatch) author = authorMatch[1];
            } catch (e) {
                author = '-';
            }
        }
        
        table.push([ chalk.redBright(r.method), chalk.red(r.path), payloadStr, chalk.gray('-'), chalk.gray('-'), chalk.yellow(author), chalk.red.bold('ORPHAN / DEAD') ]);
    });

    console.log(table.toString());

    if (deadRoutes.length === 0 && totalDeadFields === 0) {
        console.log(chalk.greenBright.bold(`\n🎉 PERFECT SCORE! 100% of your architecture is actively mapped and used.\n`));
    } else {
        if (deadRoutes.length > 0) {
            console.log(chalk.yellowBright(`\n⚠️  WARNING: Found ${deadRoutes.length} dead backend endpoints taking up space.`));
            console.log(chalk.cyan(`Run with --prune to automatically delete them.`));
        }
        if (totalDeadFields > 0) {
            console.log(chalk.yellowBright(`\n⚠️  WARNING: Found ${totalDeadFields} dead JSON fields being sent but never read by the frontend (Over-fetching).`));
        }
        
        if (process.env.CI || process.env.GITHUB_ACTIONS) {
            console.log(chalk.red.bold(`\n❌ CI PIPELINE FAILED: Dead code detected. Please prune the orphaned endpoints above before merging your Pull Request.\n`));
            process.exit(1);
        }
        console.log();
    }
}

// 1. Interactive Default Mode (when user just types `prunode`)
program
  .action(async () => {
    console.log(chalk.cyanBright.bold(`
┏━┓┏━┓╻ ╻┏┓╻┏━┓╺┳┓┏━╸
┣━┛┣┳┛┃ ┃┃┗┫┃ ┃ ┃┃┣╸ 
╹  ╹┗╸┗━┛╹ ╹┗━┛╺┻┛┗━╸
    `));
    console.log(chalk.gray.italic(`      Prunode Interactive Terminal Session\n`));
    console.log(chalk.gray(`Type ${chalk.cyanBright('scan .')} to run the AST Engine on the current directory.\n`));
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function updatePrompt() {
        rl.setPrompt(chalk.greenBright('prunode ') + chalk.cyan(process.cwd()) + chalk.greenBright('> '));
    }

    updatePrompt();
    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();
        if (!input) {
            rl.prompt();
            return;
        }

        const args = input.split(' ');
        const cmd = args[0].toLowerCase();

        try {
            if (cmd === 'exit' || cmd === 'quit') {
                process.exit(0);
            } else if (cmd === 'cd') {
                const targetDir = args[1] || process.env.HOME || process.env.USERPROFILE || '.';
                try {
                    process.chdir(targetDir);
                    updatePrompt();
                } catch (e) {
                    console.error(chalk.red(`cd: ${targetDir}: No such file or directory`));
                }
            } else if (cmd === 'scan') {
                const targetDir = args[1] || '.';
                await runScanner(targetDir);
            } else if (cmd === 'pwd') {
                console.log(process.cwd());
            } else if (cmd === 'ls' || cmd === 'dir') {
                try {
                    const files = fs.readdirSync(process.cwd(), { withFileTypes: true });
                    files.forEach(f => {
                        if (f.isDirectory()) {
                            process.stdout.write(chalk.blueBright(`${f.name}/  `));
                        } else {
                            process.stdout.write(chalk.white(`${f.name}  `));
                        }
                    });
                    console.log(); // Newline after listing
                } catch (e) {
                    console.error(chalk.red(`Cannot read directory`));
                }
            } else if (cmd === 'mkdir') {
                const targetDir = args[1];
                if (targetDir) {
                    fs.mkdirSync(path.resolve(process.cwd(), targetDir), { recursive: true });
                } else {
                    console.error(chalk.red('mkdir: missing operand'));
                }
            } else {
                let child;
                if (process.platform === 'win32') {
                    child = spawn('cmd.exe', ['/c', input], { stdio: 'inherit' });
                } else {
                    child = spawn('sh', ['-c', input], { stdio: 'inherit' });
                }
                
                await new Promise((resolve) => {
                    child.on('close', resolve);
                    child.on('error', (err: any) => {
                        console.error(chalk.red(`Command failed: ${err.message}`));
                        resolve(0);
                    });
                });
            }
        } catch (err: any) {
            console.error(chalk.red(`Error: ${err.message}`));
        }

        console.log();
        rl.prompt();
    }).on('close', () => {
        process.exit(0);
    });
  });

// 2. Direct Command Mode (when user types `prunode scan .`)
program
  .command('scan')
  .description('Scan a directory for dead API endpoints')
  .argument('<dir>', 'Directory to scan')
  .option('--sarif', 'Output results in SARIF format for GitHub Advanced Security')
  .option('--prune', 'Automatically delete dead endpoints from source code')
  .option('--html', 'Generate an interactive D3/Cytoscape HTML node graph')
  .action(async (dir, options) => {
    await runScanner(dir, options);
  });

program
  .command('serve')
  .description('Launch the interactive Prunode Dashboard locally')
  .argument('<dir>', 'Directory to scan')
  .action(async (dir) => {
    console.log(chalk.cyan(`\n🚀 Starting Prunode Dashboard Analysis...`));
    // We run the scanner silently by overriding console.log temporarily
    const originalLog = console.log;
    console.log = () => {};
    // Hack to extract graph from runScanner: pass options and read generated HTML
    const htmlPath = path.resolve(process.cwd(), 'prunode-dashboard.html');
    await runScanner(dir, { html: true }); 
    // Wait, runScanner uses hardcoded prunode-graph.html. 
    console.log = originalLog;
    
    const targetHtmlPath = path.resolve(process.cwd(), 'prunode-graph.html');
    if (!fs.existsSync(targetHtmlPath)) {
        console.error(chalk.red('Failed to generate graph HTML.'));
        return;
    }

    const htmlContent = fs.readFileSync(targetHtmlPath, 'utf8');

    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
    });

    server.listen(3000, () => {
        console.log(chalk.greenBright(`\n✨ Prunode Dashboard is live!`));
        console.log(chalk.white(`   Open `) + chalk.cyan.bold(`http://localhost:3000`) + chalk.white(` in your browser.`));
        
        // Attempt to open browser automatically
        const start = process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open';
        exec(`${start} http://localhost:3000`);
    });
  });

program.parse(process.argv);
