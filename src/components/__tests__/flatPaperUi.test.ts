import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoot = join(process.cwd(), 'src');
const sourceFiles: string[] = [];

function collectSourceFiles(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(path);
    } else if (entry.isFile() && /\.(css|tsx)$/.test(entry.name) && !path.includes('__tests__')) {
      sourceFiles.push(path);
    }
  }
}

collectSourceFiles(sourceRoot);

const forbiddenVisualTreatments = [
  /box-shadow/i,
  /shadow-\[/i,
  /(?:^|[\s"'`])shadow(?:[\s"'`]|$)/i,
  /bg-black/i,
  /text-black/i,
  /bg-\[#212121\]/i,
  /bg-\[#1e1e1e\]/i,
  /backdrop-blur/i,
  /ring-\d/i,
];

const violations = sourceFiles.flatMap((path) => {
  const contents = readFileSync(path, 'utf8');
  return forbiddenVisualTreatments
    .filter((treatment) => treatment.test(contents))
    .map((treatment) => `${path}: ${treatment}`);
});

const sharedStyles = readFileSync(join(sourceRoot, 'index.css'), 'utf8');
const setupGuide = readFileSync(join(sourceRoot, 'components', 'SupabaseGuideModal.tsx'), 'utf8');
const header = readFileSync(join(sourceRoot, 'components', 'Header.tsx'), 'utf8');
const modalSources = [
  'DashboardView.tsx',
  'ExploreView.tsx',
  'OnboardingModal.tsx',
  'PublicProfileView.tsx',
  'SupabaseGuideModal.tsx',
].map((file) => readFileSync(join(sourceRoot, 'components', file), 'utf8'));

if (!sharedStyles.includes('.paper-button.paper-button-dark:hover') || !sharedStyles.includes('.paper-button.paper-button-primary:hover')) {
  throw new Error('Primary PaperCSS button hover selectors must override the generic paper-button hover state.');
}

if (sharedStyles.includes('outline: none !important;')) {
  throw new Error('PaperCSS input focus must retain a visible focus outline.');
}

if (setupGuide.includes('text-emerald-400')) {
  throw new Error('The flat paper SQL panel must use readable dark ink text.');
}

if (!sharedStyles.includes('background-color: var(--paper-panel) !important;')) {
  throw new Error('PaperCSS card hover tint must override utility background colors.');
}

const vintagePalette = ['#D8C6A2', '#F6EBD5', '#EBD9B8', '#342018', '#7A2E25', '#B7863F'];
if (!vintagePalette.every((color) => sharedStyles.includes(color))) {
  throw new Error('PaperCSS must define the approved vintage newspaper palette.');
}

const semanticPaletteTokens = [
  '--paper-surface-raised:',
  '--paper-focus:',
  '--paper-success:',
  '--paper-danger:',
];
if (!semanticPaletteTokens.every((token) => sharedStyles.includes(token))) {
  throw new Error('PaperCSS must define semantic elevated, focus, success, and danger color tokens.');
}

if (!sharedStyles.includes('[class*="bg-[#0071DE]"]') || !sharedStyles.includes('[class*="text-[#212121]"]')) {
  throw new Error('Vintage theme overrides must cover existing PaperCSS utility surfaces and ink text.');
}

if (!sharedStyles.includes('--motion-fast: 120ms;') || !sharedStyles.includes('--motion-panel: 180ms;')) {
  throw new Error('PaperCSS motion needs shared, restrained timing tokens.');
}

if (!sharedStyles.includes('.paper-motion-menu') || !header.includes('paper-motion-menu')) {
  throw new Error('The mobile navigation menu must use the shared paper-slip motion treatment.');
}

if (!sharedStyles.includes('.paper-motion-overlay') || !sharedStyles.includes('.paper-motion-panel') || modalSources.some((source) => !source.includes('paper-motion-overlay') || !source.includes('paper-motion-panel'))) {
  throw new Error('Every project modal must use the shared paper overlay and panel motion treatment.');
}

if (!sharedStyles.includes('@media (prefers-reduced-motion: reduce)')) {
  throw new Error('PaperCSS motion must respect reduced-motion preferences.');
}

if (violations.length > 0) {
  throw new Error(`Flat PaperCSS must not contain shadow or black-surface treatments:\n${violations.join('\n')}`);
}

console.log('Flat PaperCSS visual treatment test passed');
