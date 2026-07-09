const fs = require('fs');
const path = require('path');

async function downloadWasm() {
    console.log("Downloading WebAssembly Grammars for Tree-sitter...");
    const files = [
        { url: 'https://unpkg.com/tree-sitter-javascript@0.21.3/tree-sitter-javascript.wasm', name: 'tree-sitter-javascript.wasm' },
        { url: 'https://unpkg.com/tree-sitter-typescript@0.21.2/typescript/tree-sitter-typescript.wasm', name: 'tree-sitter-typescript.wasm' }
    ];

    for (const file of files) {
        const filePath = path.join(__dirname, '..', file.name);
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`Failed to fetch ${file.url}`);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(filePath, buffer);
        console.log(`Saved: ${file.name}`);
    }
}

downloadWasm().catch(console.error);
