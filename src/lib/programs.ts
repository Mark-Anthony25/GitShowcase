export interface DegreeProgramOption {
  value: string;
  code: string;
  label: string;
  isOther?: boolean;
}

export const DEGREE_PROGRAM_OPTIONS: readonly DegreeProgramOption[] = [
  { value: 'Software Development', code: 'DEV', label: 'Software Development' },
  { value: 'Design & Creative', code: 'DESIGN', label: 'Design & Creative' },
  { value: 'Research & Analysis', code: 'RESEARCH', label: 'Research & Analysis' },
  { value: 'Other Focus Area', code: 'OTHER', label: 'Other Focus Area', isOther: true },
] as const;

export const MAIN_PROGRAM_VALUES = DEGREE_PROGRAM_OPTIONS
  .filter((option) => !option.isOther)
  .map((option) => option.value);

export function isMainDegreeProgram(program: string | null | undefined): boolean {
  return !!program && MAIN_PROGRAM_VALUES.some((value) => value.toLowerCase() === program.trim().toLowerCase());
}

export function getCanonicalProgram(program: string | null | undefined): {
  selectedOptionValue: string;
  customProgramName: string;
} {
  if (!program?.trim()) return { selectedOptionValue: 'Other Focus Area', customProgramName: '' };

  const trimmed = program.trim();
  const known = DEGREE_PROGRAM_OPTIONS.find((option) => option.value.toLowerCase() === trimmed.toLowerCase());
  return known && !known.isOther
    ? { selectedOptionValue: known.value, customProgramName: '' }
    : { selectedOptionValue: 'Other Focus Area', customProgramName: trimmed === 'Other Focus Area' ? '' : trimmed };
}

export function getProgramBadgeLabel(program: string | null | undefined): string {
  return program?.trim() || 'Focus area not specified';
}

export function getProgramFullTitle(program: string | null | undefined): string {
  return getProgramBadgeLabel(program);
}

export function matchesProgramFilter(
  profileProgram: string | null | undefined,
  filterValue: string
): boolean {
  if (!filterValue || filterValue === 'all') return true;
  if (!profileProgram) return false;
  if (filterValue === 'Other Focus Area') return !isMainDegreeProgram(profileProgram);
  return profileProgram.trim().toLowerCase() === filterValue.trim().toLowerCase();
}
