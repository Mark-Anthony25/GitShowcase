import { getTooltipPosition } from '../CommitHeatmap';

function runTests() {
  const position = getTooltipPosition(
    { left: 100, top: 200, width: 13, height: 13 },
    { width: 1000, height: 800 },
  );

  if (position.left !== 117 || position.top !== 156) {
    throw new Error(`Tooltip should stay close to the commit cell, got ${JSON.stringify(position)}`);
  }

  const rightEdgePosition = getTooltipPosition(
    { left: 195, top: 200, width: 13, height: 13 },
    { width: 300, height: 800 },
  );

  if (rightEdgePosition.left !== 11 || rightEdgePosition.top !== 156) {
    throw new Error(`Tooltip should flip to the left near the viewport edge, got ${JSON.stringify(rightEdgePosition)}`);
  }

  const topEdgePosition = getTooltipPosition(
    { left: 0, top: 20, width: 13, height: 13 },
    { width: 220, height: 800 },
  );

  if (topEdgePosition.left !== 17 || topEdgePosition.top !== 37) {
    throw new Error(`Tooltip should stay below cells near the top edge, got ${JSON.stringify(topEdgePosition)}`);
  }

  console.log('All commit heatmap tooltip tests passed');
}

runTests();
