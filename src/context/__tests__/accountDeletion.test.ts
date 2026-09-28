import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const edgeFunctionPath = join(root, 'supabase', 'functions', 'delete-account', 'index.ts');
const authContextPath = join(root, 'src', 'context', 'AuthContext.tsx');
const showcaseStorePath = join(root, 'src', 'lib', 'showcaseStore.ts');

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

const authContext = readFileSync(authContextPath, 'utf8');
const showcaseStore = readFileSync(showcaseStorePath, 'utf8');

if (!/deleteAccount:\s*\(\)\s*=>\s*Promise<void>/.test(authContext)) {
  throw new Error('AuthContext must expose deleteAccount().');
}

if (!/supabase\.functions\.invoke\('delete-account'\)/.test(authContext)) {
  throw new Error('AuthContext must invoke the protected delete-account function.');
}

if (!/export function purgeStudentShowcaseData\(profileId: string/.test(showcaseStore)) {
  throw new Error('Showcase store must expose a scoped account-data purge helper.');
}

if (!/projects\.filter\(p => p\.profile_id !== profileId\)/.test(showcaseStore)) {
  throw new Error('Local account deletion must retain projects belonging to other profiles.');
}

console.log('Account deletion server and client authorization test passed');
