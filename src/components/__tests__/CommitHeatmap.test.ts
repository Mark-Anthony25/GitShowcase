import { getTooltipPosition } from '../CommitHeatmap';

function runTests() {
  const position = getTooltipPosition(
    { left: 100, top: 200, width: 13, height: 13 },
    { width: 1000, height: 800 },
  );

  if (position.left !== 16 || position.top !== 144) {
    throw new Error(`Tooltip should stay close to the commit cell, got ${JSON.stringify(position)}`);
  }

  const edgePosition = getTooltipPosition(
    { left: 0, top: 20, width: 13, height: 13 },
    { width: 220, height: 800 },
  );

  if (edgePosition.left !== 8 || edgePosition.top !== 41) {
    throw new Error(`Tooltip should clamp inside the viewport, got ${JSON.stringify(edgePosition)}`);
  }

  console.log('All commit heatmap tooltip tests passed');
}

runTests();
