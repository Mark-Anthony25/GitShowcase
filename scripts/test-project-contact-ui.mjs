import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => (errors.push(error.message), console.error(error.message)));
  await page.route('**/src/lib/supabase.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const isSupabaseConfigured=false,supabase=null,supabaseUrl='',supabaseAnonKey='';export const updateSupabaseConfig=()=>{};` }));
  await page.route('**/src/lib/demoData.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const getDemoStudentsShowcase=()=>[{profile:JSON.parse(localStorage.getItem('gitshowcase_profiles')).creator,projects:JSON.parse(localStorage.getItem('gitshowcase_projects'))}];
    export const getDemoShowcaseByUsername=()=>null;
  ` }));
  await page.route('**/src/lib/github.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const getValidToken=()=>null;
    export const fetchLiveRepoStats=async()=>({stars:0,forks:0,language:'TypeScript',topics:[]});
    export const fetchGitHubContributions=async()=>null;
    export const fetchGitHubUserData=async()=>null;
    export const fetchUserRepos=async()=>['hidden','new-project'].map((name,index)=>({id:index+1,name,full_name:'creator/'+name,html_url:'https://github.com/creator/'+name,description:name==='hidden'?'Hidden project':'New project',stargazers_count:0,forks_count:0,language:'TypeScript'}));
  ` }));
  await page.route('**/src/context/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `
    import {updateStudentProfile} from '/src/lib/showcaseStore.ts';
    const user=window.__owner?{id:'creator-id'}:null;
    export function useAuth(){return {user,profile:window.__profile,githubToken:null,updateProfileData:updates=>updateStudentProfile('creator-id',updates),signInWithGitHub:async()=>{}};}
  ` }));
  await page.route('https://opengraph.githubassets.com/**', route => route.fulfill({ status: 404, body: '' }));
  await page.route(/\/__contact_test(?:\?|$)/, route => route.fulfill({ contentType: 'text/html', body: `
    <html><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;
    const params=new URLSearchParams(location.search);window.__owner=params.get('owner')==='true';
    window.__profile={id:'creator-id',github_username:'creator',full_name:'Creator',bio:'Available to collaborate',avatar_url:null,program:null,year_level:null,is_onboarded:true,contact_url:params.get('contact')??'mailto:creator@example.com'};
    if(!params.has('persist')){
      localStorage.clear();localStorage.setItem('gitshowcase_profiles',JSON.stringify({creator:window.__profile}));
      localStorage.setItem('gitshowcase_projects',JSON.stringify([{id:'hidden',profile_id:'creator-id',repo_full_name:'creator/hidden',repo_url:'https://github.com/creator/hidden',custom_title:'Hidden project',custom_description:'Demo',display_order:0,show_repository_link:false},{id:'legacy',profile_id:'creator-id',repo_full_name:'creator/legacy',repo_url:'https://github.com/creator/legacy',custom_title:'Legacy project',custom_description:'Demo',display_order:1}]));
    }
    const React=(await import('/node_modules/.vite/deps/react.js')).default;
    const client=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=client.createRoot??client.default.createRoot;
    await import('/src/index.css');
    const name=params.get('view')??'PublicProfileView';const Component=(await import('/src/components/'+name+'.tsx'))[name];
    createRoot(document.getElementById('root')).render(React.createElement(Component,{username:'creator',navigate:()=>{},profile:window.__profile,githubToken:null,isOpen:true,onComplete:async p=>{const {updateStudentProfile}=await import('/src/lib/showcaseStore.ts');await updateStudentProfile('creator-id',p);},onCancel:()=>{}}));
    </script></body></html>
  ` }));
  const base = process.env.CONTACT_TEST_URL || 'http://localhost:3000';
  const open = query => page.goto(`${base}/__contact_test?${query}`);
  const noHiddenRepo = async () => assert.equal(await page.locator('a[href="https://github.com/creator/hidden"]').count(), 0);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await open('view=PublicProfileView');
    const contact = page.getByRole('link', { name: 'Message me', exact: true });
    await contact.waitFor();
    assert.equal(await contact.getAttribute('href'), 'mailto:creator@example.com');
    await contact.focus();
    assert.equal(await contact.evaluate(el => el === document.activeElement), true);
    await noHiddenRepo();
    await page.getByRole('button').filter({ hasText: 'Hidden project' }).first().click();
    await page.getByText('View on GitHub', { exact: true }).waitFor({ state: 'hidden' });
    await noHiddenRepo();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  for (const view of ['LandingView', 'ExploreView', 'DashboardView']) {
    console.log('Checking',view);
    await open(`view=${view}&owner=true`);
    try { await page.getByText('Hidden project', { exact: true }).first().waitFor(); } catch (error) { console.log(await page.locator('body').innerText()); throw error; }
    await noHiddenRepo();
    if (view !== 'ExploreView') assert.equal(await page.locator('a[href="https://github.com/creator/legacy"]').count(), 1);
    if (view === 'ExploreView') {
      await page.getByText('Hidden project', { exact: true }).first().click();
      await noHiddenRepo();
      assert.equal(await page.getByRole('link', { name: 'View on GitHub' }).count(), 0);
    }
  }
  await open('view=PublicProfileView&contact=https://linkedin.com/in/creator');
  assert.equal(await page.getByRole('link', { name: 'Message me' }).getAttribute('target'), '_blank');
  await open('view=PublicProfileView&contact=javascript:alert(1)');
  await page.getByText('Available to collaborate').waitFor();
  assert.equal(await page.getByRole('link', { name: 'Message me' }).count(), 0);
  await open('view=PublicProfileView&owner=true');
  await page.getByRole('button', { name: /Edit Profile/i }).click();
  await page.getByLabel('Message me link or email (Optional)').fill('javascript:alert(1)');
  await page.getByRole('button', { name: /Save Profile/i }).click();
  await page.getByText('Enter a valid web link or email address.').waitFor();
  await page.getByLabel('Message me link or email (Optional)').fill('linkedin.com/in/creator');
  await page.getByRole('button', { name: /Save Profile/i }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('gitshowcase_profiles')).creator.contact_url === 'https://linkedin.com/in/creator');
  await open('view=PublicProfileView&owner=true&persist=true');
  assert.equal(await page.getByRole('link', { name: 'Message me' }).getAttribute('href'), 'https://linkedin.com/in/creator');
  await page.getByRole('button', { name: 'Edit Profile' }).click();
  await page.getByLabel('Message me link or email (Optional)').fill('');
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('gitshowcase_profiles')).creator.contact_url === null);
  assert.equal(await page.getByRole('link', { name: 'Message me' }).count(), 0);
  await open('view=DashboardView&owner=true');
  await page.getByRole('button', { name: 'Edit project details' }).first().click();
  const setting = page.getByRole('checkbox', { name: /Show repository link/ });
  assert.equal(await setting.isChecked(), false);
  await setting.focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('gitshowcase_projects')).find(p => p.id === 'hidden').show_repository_link === true);
  await open('view=DashboardView&owner=true&persist=true');
  await page.locator('a[href="https://github.com/creator/hidden"]').waitFor();
  await page.locator('#tab-import-repos-btn').click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  assert.equal(await setting.isChecked(), false);
  await setting.check();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    canvas.getContext('2d').fillRect(0, 0, 64, 64);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.getByRole('button', { name: 'Change Image' }).click();
  assert.equal(await setting.isChecked(), true, 'changing the cover must preserve the repository setting');
  await setting.uncheck();
  await page.locator('form').getByRole('button', { name: 'Publish', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('gitshowcase_projects')).find(p => p.repo_full_name === 'creator/new-project')?.show_repository_link === false);
  await open('view=OnboardingModal&owner=true');
  await page.getByLabel('Message me link or email (Optional)').fill('social.example/creator');
  await page.locator('#onboarding-step1-next-btn').click();
  await setting.waitFor();
  assert.equal(await setting.isChecked(), false);
  await setting.check();
  await page.locator('#onboarding-step2-next-btn').click();
  await page.locator('#complete-onboarding-btn').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('gitshowcase_projects')).find(p => p.id === 'hidden').show_repository_link === true);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('gitshowcase_profiles')).creator.contact_url === 'https://social.example/creator');
  assert.deepEqual(errors, []);
  console.log('Contact and repository UI passed on mobile and desktop, including anonymous access, keyboard focus, validation and reload');
} finally { await browser.close(); }
