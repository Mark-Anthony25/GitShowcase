import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const text = (...codes: number[]) => String.fromCharCode(...codes);
const forbidden = [
  new RegExp(`\\b${text(105, 115, 117)}\\b`, 'i'),
  new RegExp(text(99, 97, 117, 97, 121, 97, 110), 'i'),
  new RegExp(text(105, 115, 97, 98, 101, 108, 97, 32, 115, 116, 97, 116, 101, 32, 117, 110, 105, 118, 101, 114, 115, 105, 116, 121), 'i'),
  new RegExp(`${text(105, 115, 117)}\\.${text(101, 100, 117)}`, 'i'),
];

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split(/\r?\n/);
const matches = trackedFiles.filter((file) => {
  // Agent skill assets are tooling, not shipped application copy.
  if (file.startsWith('.agents/')) return false;
  if (statSync(file).isDirectory()) return false;
  const content = readFileSync(file, 'utf8');
  return forbidden.some((pattern) => pattern.test(content));
});

assert.deepEqual(matches, []);
console.log('Institution-neutrality test passed');
