class ToggleStorage {
  private values = new Map<string, string>();
  failWrites = false;

  get length() {
    return this.values.size;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('Storage unavailable');
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const storage = new ToggleStorage();
Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

const store = await import('../showcaseStore');

const profile = {
  id: 'purge-test-user',
  github_username: 'purge-test-user',
  full_name: 'Purge Test User',
  avatar_url: null,
  bio: null,
  program: 'BS Computer Science',
  year_level: '1st Year',
};

await store.updateStudentProfile(profile.id, profile);
await store.addProjectToShowcase({
  profileId: profile.id,
  repoFullName: 'purge-test-user/project',
  repoUrl: 'https://github.com/purge-test-user/project',
});

storage.failWrites = true;
const purged = store.purgeStudentShowcaseData(profile.id, profile.github_username);

if (purged !== false) {
  throw new Error('A failed local account-data purge must report failure.');
}

storage.failWrites = false;
const retainedProfile = await store.getProfileById(profile.id, true);
const retainedProjects = await store.getStudentShowcasedProjects(profile.id, null, true);

if (!retainedProfile || retainedProjects.length !== 1) {
  throw new Error('A failed local purge must retain the account data for retry.');
}

console.log('Account deletion local purge failure test passed');
