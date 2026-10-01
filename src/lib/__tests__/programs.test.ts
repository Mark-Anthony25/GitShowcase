import assert from 'node:assert/strict';
import { getCanonicalProgram, getProgramBadgeLabel, matchesProgramFilter } from '../programs';

assert.equal(getProgramBadgeLabel(null), 'Focus area not specified');
assert.equal(matchesProgramFilter('BS Computer Science', 'all'), true);
assert.deepEqual(getCanonicalProgram('BS Computer Science'), {
  selectedOptionValue: 'Other Focus Area',
  customProgramName: 'BS Computer Science',
});

console.log('Focus area compatibility tests passed');
