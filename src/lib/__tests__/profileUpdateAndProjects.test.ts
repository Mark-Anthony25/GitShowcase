import { 
  addProjectToShowcase, 
  getStudentShowcasedProjects, 
  syncStudentShowcaseProjects, 
  removeProjectFromShowcase,
  updateStudentProfile,
  deduplicateProjectsList,
  getProfileById,
  getStudentShowcaseByUsername
} from '../showcaseStore';
import { ShowcasedProject, Profile } from '../../types';

async function runTests() {
  console.log('=== Running Profile Update & Project Selection Unit Tests ===\n');

  // Setup Mock Profile
  const testProfileId = `test-user-${Date.now()}`;
  const initialProfile: Profile = {
    id: testProfileId,
    github_username: 'student-tester',
    full_name: 'Student Tester',
    headline: 'BS Computer Science • Full-Stack Developer',
    avatar_url: 'https://github.com/student-tester.png',
    bio: 'Building awesome apps',
    program: 'BS Computer Science',
    year_level: '3rd Year',
    is_onboarded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await updateStudentProfile(testProfileId, initialProfile);
  console.log('✓ Setup: Initial student profile created');

  // Test 1: Add Project A
  const projA = await addProjectToShowcase({
    profileId: testProfileId,
    repoFullName: 'student-tester/project-alpha',
    repoUrl: 'https://github.com/student-tester/project-alpha',
    customTitle: 'Project Alpha',
    customDescription: 'Initial Description Alpha',
  });

  if (!projA || projA.repo_full_name !== 'student-tester/project-alpha') {
    throw new Error('Test 1 Failed: Project A was not added');
  }

  let showcased = await getStudentShowcasedProjects(testProfileId, null, true);
  if (showcased.length !== 1) {
    throw new Error(`Test 1 Failed: Expected 1 showcased project, found ${showcased.length}`);
  }
  console.log('✓ Test 1: Project A added successfully');

  // Test 2: Add Project A AGAIN (Simulating duplicate selection / repeated save)
  const projA2 = await addProjectToShowcase({
    profileId: testProfileId,
    repoFullName: 'student-tester/project-alpha',
    repoUrl: 'https://github.com/student-tester/project-alpha',
    customTitle: 'Project Alpha Updated',
    customDescription: 'Updated Description Alpha',
  });

  showcased = await getStudentShowcasedProjects(testProfileId, null, true);
  if (showcased.length !== 1) {
    throw new Error(`Test 2 Failed: Duplicate project was added! Expected 1, found ${showcased.length}`);
  }
  if (showcased[0].custom_title !== 'Project Alpha Updated') {
    throw new Error(`Test 2 Failed: Existing project was not updated in-place`);
  }
  console.log('✓ Test 2: Selecting / saving Project A again updates in-place and prevents duplicates');

  // Test 3: Case-insensitive duplicate prevention ('student-tester/project-alpha' vs 'Student-Tester/Project-Alpha')
  await addProjectToShowcase({
    profileId: testProfileId,
    repoFullName: 'Student-Tester/Project-Alpha',
    repoUrl: 'https://github.com/student-tester/project-alpha',
    customTitle: 'Project Alpha Case Insensitive',
    customDescription: 'Case variation test',
  });

  showcased = await getStudentShowcasedProjects(testProfileId, null, true);
  if (showcased.length !== 1) {
    throw new Error(`Test 3 Failed: Case variation created a duplicate! Expected 1, found ${showcased.length}`);
  }
  console.log('✓ Test 3: Case-insensitive repository matching prevents duplicates');

  // Test 4: Add Project B alongside Project A
  const projB = await addProjectToShowcase({
    profileId: testProfileId,
    repoFullName: 'student-tester/project-beta',
    repoUrl: 'https://github.com/student-tester/project-beta',
    customTitle: 'Project Beta',
    customDescription: 'Second project',
  });

  showcased = await getStudentShowcasedProjects(testProfileId, null, true);
  if (showcased.length !== 2) {
    throw new Error(`Test 4 Failed: Expected 2 projects (A and B), found ${showcased.length}`);
  }
  console.log('✓ Test 4: Multiple distinct projects (A & B) are preserved correctly');

  // Test 5: Batch Sync with No Changes (Idempotency)
  const syncMapNoChanges = {
    'student-tester/project-alpha': {
      customTitle: 'Project Alpha',
      customDescription: 'Alpha Desc',
    },
    'student-tester/project-beta': {
      customTitle: 'Project Beta',
      customDescription: 'Beta Desc',
    }
  };

  await syncStudentShowcaseProjects(testProfileId, syncMapNoChanges);
  showcased = await getStudentShowcasedProjects(testProfileId, null, true);
  if (showcased.length !== 2) {
    throw new Error(`Test 5 Failed: Saving without changes modified project count! Expected 2, found ${showcased.length}`);
  }
  console.log('✓ Test 5: Saving profile with no project changes creates 0 duplicates');

  // Test 6: Removing Project A via Sync (Explicit Deselection)
  const syncMapOnlyBeta = {
    'student-tester/project-beta': {
      customTitle: 'Project Beta',
      customDescription: 'Beta Desc',
    }
  };

  await syncStudentShowcaseProjects(testProfileId, syncMapOnlyBeta);
  showcased = await getStudentShowcasedProjects(testProfileId, null, true);
  if (showcased.length !== 1 || showcased[0].repo_full_name !== 'student-tester/project-beta') {
    throw new Error(`Test 6 Failed: Deselected Project A was not removed! Expected [Beta], found ${JSON.stringify(showcased.map(p => p.repo_full_name))}`);
  }
  console.log('✓ Test 6: Deselected Project A was cleanly removed while Project B was preserved');

  // Test 7: Deduplication array helper
  const dirtyList: ShowcasedProject[] = [
    { id: '1', profile_id: testProfileId, repo_full_name: 'org/repo1', repo_url: '', custom_title: null, custom_description: null, display_order: 0 },
    { id: '2', profile_id: testProfileId, repo_full_name: 'org/repo1', repo_url: '', custom_title: null, custom_description: null, display_order: 0 },
    { id: '3', profile_id: testProfileId, repo_full_name: 'ORG/REPO1', repo_url: '', custom_title: null, custom_description: null, display_order: 0 },
    { id: '4', profile_id: testProfileId, repo_full_name: 'org/repo2', repo_url: '', custom_title: null, custom_description: null, display_order: 0 },
  ];
  const cleaned = deduplicateProjectsList(dirtyList);
  if (cleaned.length !== 2) {
    throw new Error(`Test 7 Failed: deduplicateProjectsList expected 2 unique items, got ${cleaned.length}`);
  }
  console.log('✓ Test 7: Array deduplication utility guarantees 100% unique projects');

  // Test 8: Skip Profile Flow Preserves Data
  const updatedProfile = await updateStudentProfile(testProfileId, {
    // Omitting optional fields (skipping update)
    full_name: initialProfile.full_name,
    headline: initialProfile.headline,
  });

  if (updatedProfile?.headline !== initialProfile.headline || updatedProfile?.bio !== initialProfile.bio) {
    throw new Error('Test 8 Failed: Skipping optional fields corrupted existing profile data');
  }
  console.log('✓ Test 8: Skipping optional profile fields leaves existing user data intact');

  // Test 9: Updating Profile Without github_username in payload preserves username and invalidates showcase cache
  const updatedWithNewBio = await updateStudentProfile(testProfileId, {
    full_name: 'Mark Anthony Updated',
    bio: 'Updated bio 2026',
    headline: 'Senior Full-Stack Architect',
    program: 'BS Information Technology',
    year_level: '4th Year',
  });

  if (!updatedWithNewBio) {
    throw new Error('Test 9 Failed: updateStudentProfile returned null');
  }
  if (updatedWithNewBio.github_username !== 'student-tester') {
    throw new Error(`Test 9 Failed: github_username was wiped out! Expected student-tester, got ${updatedWithNewBio.github_username}`);
  }
  if (updatedWithNewBio.bio !== 'Updated bio 2026' || updatedWithNewBio.program !== 'BS Information Technology') {
    throw new Error('Test 9 Failed: Profile fields were not updated');
  }
  console.log('✓ Test 9: Partial updates preserve github_username and persist modified fields');

  // Test 10: getProfileById and getStudentShowcaseByUsername reflect updated profile immediately
  const fetchedProfile = await getProfileById(testProfileId);
  if (!fetchedProfile || fetchedProfile.bio !== 'Updated bio 2026' || fetchedProfile.full_name !== 'Mark Anthony Updated') {
    throw new Error(`Test 10 Failed: getProfileById returned stale profile: ${JSON.stringify(fetchedProfile)}`);
  }

  const showcaseData = await getStudentShowcaseByUsername('student-tester');
  if (!showcaseData || showcaseData.profile.bio !== 'Updated bio 2026' || showcaseData.profile.full_name !== 'Mark Anthony Updated') {
    throw new Error(`Test 10 Failed: getStudentShowcaseByUsername returned stale profile data: ${JSON.stringify(showcaseData?.profile)}`);
  }
  console.log('✓ Test 10: getProfileById and getStudentShowcaseByUsername synchronize immediately with zero stale cache');

  // Test 11: Idempotent upsert verification
  const upsertedAgain = await updateStudentProfile(testProfileId, {
    headline: 'Chief Systems Architect',
  });
  if (upsertedAgain?.headline !== 'Chief Systems Architect' || upsertedAgain?.bio !== 'Updated bio 2026') {
    throw new Error('Test 11 Failed: Successive upsert did not merge fields cleanly');
  }
  console.log('✓ Test 11: Successive updates cleanly merge fields without loss');

  console.log('\nAll 11 Profile Update & Project Selection Tests Passed Perfectly!\n');
}

runTests().catch(err => {
  console.error('Test Runner Error:', err);
  process.exit(1);
});
