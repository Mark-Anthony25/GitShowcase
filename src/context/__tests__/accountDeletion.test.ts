import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const edgeFunctionPath = join(root, 'supabase', 'functions', 'delete-account', 'index.ts');

if (!existsSync(edgeFunctionPath)) {
  throw new Error('Account deletion Edge Function is missing.');
}

const edgeFunction = readFileSync(edgeFunctionPath, 'utf8');

if (!/auth\.getUser\(token\)/.test(edgeFunction)) {
  throw new Error('Account deletion must resolve the caller from the bearer token.');
}

if (!/auth\.admin\.deleteUser\(caller\.id\)/.test(edgeFunction)) {
  throw new Error('Account deletion must remove only the authenticated caller.');
}

if (/deleteUser\(.*body/.test(edgeFunction)) {
  throw new Error('Account deletion must never accept a user ID from the request body.');
}

console.log('Account deletion server authorization test passed');
