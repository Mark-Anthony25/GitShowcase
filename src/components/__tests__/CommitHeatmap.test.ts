import { getCompleteWeek, getMobileHeatmapGridStyle, getTooltipPosition } from '../CommitHeatmap';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function runTests() {
  const mobileGrid = getMobileHeatmapGridStyle();
  if (mobileGrid.gridTemplateColumns !== 'repeat(52, minmax(0, 1fr))') {
    throw new Error('Mobile heatmap must fit all 52 weekly columns without horizontal clipping.');
  }

  const paddedWeek = getCompleteWeek([
    { date: '2026-09-27', count: 3, level: 1 },
    { date: '2026-09-28', count: 0, level: 0 },
  ]);
  if (paddedWeek.length !== 7 || paddedWeek[2].date !== '2026-09-29' || paddedWeek[2].count !== 0) {
    throw new Error('Partial contribution weeks must render seven days, including zero-contribution cells.');
  }

  const position = getTooltipPosition(
    { left: 100, top: 200, width: 13, height: 13 },
    { width: 1000, height: 800 },
  );

  if (position.left !== 121 || position.top !== 144) {
    throw new Error(`Tooltip should stay close to the commit cell, got ${JSON.stringify(position)}`);
  }

  const rightEdgePosition = getTooltipPosition(
    { left: 270, top: 200, width: 13, height: 13 },
    { width: 300, height: 800 },
  );

  if (rightEdgePosition.left !== 82 || rightEdgePosition.top !== 144) {
    throw new Error(`Tooltip should flip to the left near the viewport edge, got ${JSON.stringify(rightEdgePosition)}`);
  }

  const topEdgePosition = getTooltipPosition(
    { left: 0, top: 20, width: 13, height: 13 },
    { width: 220, height: 800 },
  );

  if (topEdgePosition.left !== 21 || topEdgePosition.top !== 41) {
    throw new Error(`Tooltip should stay close and below cells near the top edge, got ${JSON.stringify(topEdgePosition)}`);
  }

  const source = readFileSync(join(process.cwd(), 'src', 'components', 'CommitHeatmap.tsx'), 'utf8');
  if (source.includes('text-stone-600')) {
    throw new Error('Contribution activity labels must use the high-contrast PaperCSS ink color.');
  }

  if (!source.includes('font-bold text-[#065F46]') || !source.includes('text-stone-800 text-[10px]')) {
    throw new Error('Contribution tooltip text must use colors that contrast with its light background.');
  }

  console.log('All commit heatmap tooltip and contrast tests passed');
}

runTests();
