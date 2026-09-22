export function getStarCountLabel(stats: { stars: number } | undefined): string {
  return stats ? String(stats.stars) : 'Not available';
}
