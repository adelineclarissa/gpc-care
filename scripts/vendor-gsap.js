// Copies the GSAP UMD build from node_modules into public/ so the browser can
// load it with a plain <script> tag (this project has no bundler).
// Run with: npm run vendor
import { copyFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'node_modules/gsap/dist/gsap.min.js');
const target = resolve(root, 'public/gsap.min.js');

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);

const { version } = JSON.parse(await readFile(resolve(root, 'node_modules/gsap/package.json'), 'utf8'));
console.log(`Vendored gsap ${version} -> public/gsap.min.js`);
