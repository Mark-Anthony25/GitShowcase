import assert from 'node:assert/strict';
import { normalizeTechStack } from '../techStack';
import { updateStudentProfile } from '../showcaseStore';

assert.deepEqual(normalizeTechStack([' React ', '', 'react', 'C++', 'PostgreSQL']), ['React', 'C++', 'PostgreSQL']);
assert.deepEqual(normalizeTechStack([]), []);
assert.throws(() => normalizeTechStack(Array.from({ length: 11 }, (_, i) => `Tech ${i}`)), /10/);
assert.throws(() => normalizeTechStack(['x'.repeat(31)]), /30/);
assert.throws(() => normalizeTechStack('React' as any), /list/);
assert.throws(() => normalizeTechStack([42] as any), /text/);
const id = `tech-${Date.now()}`;
assert.deepEqual((await updateStudentProfile(id, { github_username: id, tech_stack: [' React ', 'react', 'Custom tech'] }))?.tech_stack, ['React', 'Custom tech']);
assert.deepEqual((await updateStudentProfile(id, { full_name: 'Creator' }))?.tech_stack, ['React', 'Custom tech']);
assert.deepEqual((await updateStudentProfile(id, { tech_stack: [] }))?.tech_stack, []);
await assert.rejects(() => updateStudentProfile(id, { tech_stack: ['x'.repeat(31)] }), /30/);
console.log('Creator-selected tech stack validation and persistence passed');
