export function getStarCountLabel(stats: { stars: number } | undefined): string {
  return stats !== undefined ? String(stats.stars) : '—';
}
