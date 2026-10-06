export const TECH_STACK_SUGGESTIONS = ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Node.js', 'Python', 'Java', 'Flutter', 'Dart', 'Supabase', 'PostgreSQL'];

export function normalizeTechStack(value: string[]): string[] {
  if (!Array.isArray(value)) throw new Error('Tech stack must be a list.');
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') throw new Error('Technologies must be text.');
    const tech = entry.trim();
    if (!tech) continue;
    if (tech.length > 30) throw new Error('Each technology must be 30 characters or fewer.');
    if (!result.some(existing => existing.toLowerCase() === tech.toLowerCase())) result.push(tech);
  }
  if (result.length > 10) throw new Error('Choose up to 10 technologies.');
  return result;
}
