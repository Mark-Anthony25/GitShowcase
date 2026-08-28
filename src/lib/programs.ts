export interface DegreeProgramOption {
  value: string;
  code: string;
  label: string;
  isOther?: boolean;
}

export const DEGREE_PROGRAM_OPTIONS: readonly DegreeProgramOption[] = [
  {
    value: 'BS Computer Science',
    code: 'BSCS',
    label: 'BS Computer Science',
  },
  {
    value: 'BS Information Technology',
    code: 'BSIT',
    label: 'BS Information Technology',
  },
  {
    value: 'BS Entertainment and Multimedia Computing',
    code: 'BSEMC',
    label: 'BS Entertainment and Multimedia Computing',
  },
  {
    value: 'BS Accounting Information Systems',
    code: 'BSAIS',
    label: 'BS Accounting Information Systems',
  },
  {
    value: 'Other Programs',
    code: 'OTHER',
    label: 'Other Programs',
    isOther: true,
  },
] as const;

export const MAIN_PROGRAM_VALUES = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Entertainment and Multimedia Computing',
  'BS Accounting Information Systems',
] as const;

/**
 * Check if a given program string is one of the 4 main programs
 */
export function isMainDegreeProgram(program: string | null | undefined): boolean {
  if (!program) return false;
  const trimmed = program.trim().toLowerCase();
  return (
    trimmed === 'bs entertainment and multimedia computing' ||
    trimmed === 'bsemc' ||
    trimmed === 'bs computer science' ||
    trimmed === 'bscs' ||
    trimmed === 'bs information technology' ||
    trimmed === 'bsit' ||
    trimmed === 'bs accounting information systems' ||
    trimmed === 'bsais'
  );
}

/**
 * Get canonical program option by value, code, or custom string
 */
export function getCanonicalProgram(program: string | null | undefined): {
  selectedOptionValue: string;
  customProgramName: string;
} {
  if (!program || !program.trim()) {
    return {
      selectedOptionValue: 'BS Computer Science',
      customProgramName: '',
    };
  }

  const trimmed = program.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'bs entertainment and multimedia computing' || lower === 'bsemc') {
    return { selectedOptionValue: 'BS Entertainment and Multimedia Computing', customProgramName: '' };
  }
  if (lower === 'bs computer science' || lower === 'bscs') {
    return { selectedOptionValue: 'BS Computer Science', customProgramName: '' };
  }
  if (lower === 'bs information technology' || lower === 'bsit') {
    return { selectedOptionValue: 'BS Information Technology', customProgramName: '' };
  }
  if (lower === 'bs accounting information systems' || lower === 'bsais') {
    return { selectedOptionValue: 'BS Accounting Information Systems', customProgramName: '' };
  }

  // It is a custom "Other Programs"
  return {
    selectedOptionValue: 'Other Programs',
    customProgramName: trimmed === 'Other Programs' ? '' : trimmed,
  };
}

/**
 * Get clean badge label or display name for a student's degree program
 */
export function getProgramBadgeLabel(program: string | null | undefined): string {
  if (!program || !program.trim()) return 'Student';

  const trimmed = program.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'bs entertainment and multimedia computing' || lower === 'bsemc') {
    return 'BS Entertainment and Multimedia Computing';
  }
  if (lower === 'bs computer science' || lower === 'bscs') {
    return 'BS Computer Science';
  }
  if (lower === 'bs information technology' || lower === 'bsit') {
    return 'BS Information Technology';
  }
  if (lower === 'bs accounting information systems' || lower === 'bsais') {
    return 'BS Accounting Information Systems';
  }

  return trimmed;
}

/**
 * Get full descriptive display name for a degree program
 */
export function getProgramFullTitle(program: string | null | undefined): string {
  return getProgramBadgeLabel(program);
}

/**
 * Matches a student's stored program string with a filter option value
 */
export function matchesProgramFilter(
  studentProgram: string | null | undefined,
  filterValue: string
): boolean {
  if (!filterValue || filterValue === 'all') return true;
  if (!studentProgram) return false;

  const progLower = studentProgram.trim().toLowerCase();
  const filterLower = filterValue.trim().toLowerCase();

  if (filterLower === 'bs entertainment and multimedia computing' || filterLower === 'bsemc') {
    return progLower === 'bs entertainment and multimedia computing' || progLower === 'bsemc';
  }
  if (filterLower === 'bs computer science' || filterLower === 'bscs') {
    return progLower === 'bs computer science' || progLower === 'bscs';
  }
  if (filterLower === 'bs information technology' || filterLower === 'bsit') {
    return progLower === 'bs information technology' || progLower === 'bsit';
  }
  if (filterLower === 'bs accounting information systems' || filterLower === 'bsais') {
    return progLower === 'bs accounting information systems' || progLower === 'bsais';
  }
  if (filterLower === 'other programs' || filterLower === 'other') {
    return !isMainDegreeProgram(studentProgram);
  }

  return progLower === filterLower;
}
