import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim());

if (scripts.length === 0) throw new Error('Ingen JavaScript-kod hittades i index.html');

for (const [index, source] of scripts.entries()) {
  new Script(source, { filename: 'index.html script ' + (index + 1) });
}

console.log('Syntaxkontroll godkänd: ' + scripts.length + ' JavaScript-block.');
