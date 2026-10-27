import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';

const files = ['index.html', 'rink-riot/index.html', 'rink-riot/v03/index.html'];
let checked = 0;
for (const file of files) {
  if (!existsSync(file)) throw new Error('Saknar förväntad HTML-fil: ' + file);
  const html = readFileSync(file, 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());
  if (scripts.length === 0) throw new Error('Ingen JavaScript-kod hittades i ' + file);
  for (const [index, source] of scripts.entries()) {
    new Script(source, { filename: file + ' script ' + (index + 1) });
    checked++;
  }
}
console.log('Syntaxkontroll godkänd: ' + checked + ' JavaScript-block i ' + files.length + ' HTML-filer.');
