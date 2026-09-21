import { getDemoStudentsShowcase, getDemoShowcaseByUsername } from '../demoData';

async function runTests() {
  const students = getDemoStudentsShowcase();

  if (students.length < 2) {
    throw new Error(`Demo data test failed: expected at least 2 students, found ${students.length}`);
  }

  if (!students.every((student) => student.profile.github_username && student.projects.length > 0)) {
    throw new Error('Demo data test failed: every demo student needs a profile and project');
  }

  const first = students[0];
  const lookup = getDemoShowcaseByUsername(first.profile.github_username);
  if (!lookup || lookup.profile.github_username !== first.profile.github_username) {
    throw new Error('Demo data test failed: username lookup did not return deterministic profile');
  }

  const missing = getDemoShowcaseByUsername('does-not-exist');
  if (missing !== null) {
    throw new Error('Demo data test failed: unknown username should return null');
  }

  console.log('All demo data tests passed');
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
