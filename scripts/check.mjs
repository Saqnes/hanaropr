import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = readdirSync(root).filter((file) => file.endsWith('.html'));
const errors = [];

function localPath(file, rawUrl) {
  const url = rawUrl.split(/[?#]/)[0];
  if (!url || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(rawUrl)) return null;
  const normalized = url.startsWith('/') ? url.slice(1) : url;
  return path.resolve(path.dirname(path.join(root, file)), normalized);
}

for (const file of htmlFiles) {
  const html = readFileSync(path.join(root, file), 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) errors.push(`${file}: duplicate id`);

  const h1Count = (html.match(/<h1\b/g) || []).length;
  if (h1Count !== 1) errors.push(`${file}: expected one h1, found ${h1Count}`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${file}: missing title`);
  if (!/<meta\s+name="description"\s+content="[^"]+"/.test(html)) errors.push(`${file}: missing description`);
  if (!/<link\s+rel="canonical"\s+href="https:\/\//.test(html)) errors.push(`${file}: missing canonical`);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const rawUrl = match[1];
    const target = localPath(file, rawUrl);
    if (target && !existsSync(target)) errors.push(`${file}: missing local target ${rawUrl}`);

    const hash = rawUrl.includes('#') ? rawUrl.slice(rawUrl.indexOf('#') + 1) : '';
    if (hash && !rawUrl.startsWith('http')) {
      const [linkedFile] = rawUrl.split('#');
      const targetFile = linkedFile || file;
      const targetHtmlPath = path.resolve(path.dirname(path.join(root, file)), targetFile);
      if (existsSync(targetHtmlPath)) {
        const targetHtml = readFileSync(targetHtmlPath, 'utf8');
        if (!new RegExp(`\\sid=["']${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(targetHtml)) {
          errors.push(`${file}: missing fragment target ${rawUrl}`);
        }
      }
    }
  }

  for (const match of html.matchAll(/<[^>]+aria-controls="([^"]+)"[^>]*>/g)) {
    if (!idSet.has(match[1])) errors.push(`${file}: aria-controls target #${match[1]} is missing`);
  }

  for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener[^"]*"/.test(match[0])) errors.push(`${file}: target=_blank without noopener`);
  }
}

for (const required of [
  'robots.txt',
  'sitemap.xml',
  'assets/og-2026.png',
  'home/index.html',
  'members/index.html',
  'support/index.html',
  'contact/index.html',
]) {
  if (!existsSync(path.join(root, required))) errors.push(`missing ${required}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} pages: links, fragments, headings, metadata and accessibility references are valid.`);
