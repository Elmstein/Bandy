import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Always compare with the previous known version, never current candidate code.
const supplied = process.env.VISUAL_REFERENCE_SHA?.trim();
const valid = supplied && /^[0-9a-f]{40}$/i.test(supplied) && !/^0+$/.test(supplied);
const ref = valid ? supplied : 'HEAD^';
function readReference() {
  try {
    return execFileSync('git', ['show', ref + ':index.html'], { encoding: 'utf8' });
  } catch (error) {
    if (!valid) throw new Error('Missing baseline ' + ref + ':index.html', { cause: error });
    execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', ref], { stdio: 'inherit' });
    return execFileSync('git', ['show', ref + ':index.html'], { encoding: 'utf8' });
  }
}
const html = readReference();
if (!html.includes('id="stage"') || !html.includes('<svg')) {
  throw new Error('Visual reference is not a bandy application');
}
const output = resolve('.visual-reference');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'index.html'), html, 'utf8');
console.log('Visual reference commit: ' + ref + ', index.html length: ' + html.length);
