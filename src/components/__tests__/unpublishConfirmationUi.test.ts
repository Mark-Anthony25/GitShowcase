import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dashboard = readFileSync(join(process.cwd(), 'src', 'components', 'DashboardView.tsx'), 'utf8');

if (/\bconfirm\s*\(/.test(dashboard)) {
  throw new Error('Unpublishing must use the themed in-app confirmation, not the browser confirm dialog.');
}

for (const expected of [
  'projectPendingUnpublish',
  'Unpublish Dispatch',
  'paper-card paper-motion-panel',
  'Keep Published',
  'Unpublish Project',
]) {
  if (!dashboard.includes(expected)) {
    throw new Error(`The PaperCSS unpublish confirmation is missing: ${expected}`);
  }
}

console.log('PaperCSS unpublish confirmation UI test passed');
