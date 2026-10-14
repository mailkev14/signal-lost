import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['shared/puzzles.js', 'shared/engine.js', 'src/icons.js', 'src/network.js', 'src/training.js', 'src/views.js', 'src/app.js'];
// The deliberately small module graph uses only named declarations and single-line imports.
// This portable training artifact has no imports, downloads, service worker, or live network.
let bundle = 'window.__SIGNAL_OFFLINE__ = true;\n';
for (const file of files) {
  let code = await readFile(resolve(root, file), 'utf8');
  code = code.replace(/^import .*;\s*$/gm, '').replace(/^export (?=(?:const|function|class|async function)\b)/gm, '');
  bundle += `\n// --- ${file} ---\n${code}\n`;
}
const css = await readFile(resolve(root, 'src/styles.css'), 'utf8');
const favicon = await readFile(resolve(root, 'public/favicon.svg'), 'utf8');
const html = `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b111b"><title>Signal Lost - Solo Training</title><link rel="icon" href="data:image/svg+xml,${encodeURIComponent(favicon)}"><style>${css}</style></head><body><div id="app"></div><noscript>JavaScript is required for the training simulation.</noscript><script type="module">${bundle.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
await mkdir(resolve(root, 'dist'), { recursive: true });
await writeFile(resolve(root, 'dist/signal-lost-training.html'), html);
console.log('Built dist/signal-lost-training.html (offline solo training; multiplayer is in the full project).');
