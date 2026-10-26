import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
let activePage;
try {
  const page = await browser.newPage();
  activePage = page;
  page.setDefaultTimeout(30000);
  const errors = [], gitHubRequests = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('request', request => { if (request.url().includes('opengraph.githubassets.com')) gitHubRequests.push(request.url()); });
  await page.route('**/src/lib/supabase.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const isSupabaseConfigured=false,supabase=null,supabaseUrl='',supabaseAnonKey='';export const updateSupabaseConfig=()=>{};` }));
  await page.route('**/src/lib/demoData.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const getDemoStudentsShowcase=()=>[{profile:window.__profile,projects:JSON.parse(localStorage.getItem('gitshowcase_projects')||'[]')}];export const getDemoShowcaseByUsername=()=>null;` }));
  await page.route('**/src/context/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `const user={id:'creator'};export const useAuth=()=>({user,profile:window.__profile,githubToken:null,signInWithGitHub:async()=>{}});` }));
  await page.route('**/src/lib/github.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const getValidToken=()=>null;export const fetchUserRepos=async()=>['existing','another','third'].map((name,index)=>({id:index+1,name,full_name:'creator/'+name,html_url:'https://github.com/creator/'+name,description:'GitHub project',stargazers_count:2,forks_count:0,language:'TypeScript'}));export const fetchLiveRepoStats=async()=>({stars:2,forks:0,language:'TypeScript',topics:[],homepage:'https://github-demo.example'});export const fetchGitHubContributions=async()=>null;export const fetchGitHubUserData=async()=>null;` }));
  await page.route('https://opengraph.githubassets.com/**', route => route.fulfill({ status: 404, body: '' }));
  await page.route(/\/__manual_test(?:\?|$)/, route => route.fulfill({ contentType: 'text/html', body: `
    <html><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;
    const params=new URLSearchParams(location.search);
    window.__profile={id:'creator',github_username:'creator',full_name:'Creator',avatar_url:null,bio:'Projects',program:null,year_level:null,is_onboarded:true};
    if(!params.has('persist')){localStorage.clear();localStorage.setItem('gitshowcase_profiles',JSON.stringify({creator:window.__profile}));localStorage.setItem('gitshowcase_projects','[]');}
    const React=(await import('/node_modules/.vite/deps/react.js')).default;const client=await import('/node_modules/.vite/deps/react-dom_client.js');
    await import('/src/index.css');const name=params.get('view')||'DashboardView';const Component=(await import('/src/components/'+name+'.tsx'))[name];
    (client.createRoot??client.default.createRoot)(document.getElementById('root')).render(React.createElement(Component,{username:'creator',navigate:()=>{},isOpen:true,profile:window.__profile,githubToken:null,onComplete:async()=>{},onCancel:()=>{}}));
    </script></body></html>
  ` }));
  const base = process.env.MANUAL_TEST_URL || 'http://localhost:3000';
  const open = query => page.goto(`${base}/__manual_test?${query}`);
  const rows = () => page.evaluate(() => JSON.parse(localStorage.getItem('gitshowcase_projects')));
  await page.setViewportSize({ width: 390, height: 900 });
  await open('');
  await page.getByPlaceholder('Filter published projects...').fill('unrelated search');
  await page.getByRole('button', { name: 'Add Project', exact: true }).click();
  const choice = page.getByRole('dialog', { name: 'Add Project', exact: true });
  await choice.getByRole('button', { name: 'Add project manually' }).focus();
  await page.keyboard.press('Enter');
  const publish = page.getByRole('dialog', { name: 'Publish', exact: true });
  await publish.getByLabel('Project Title', { exact: true }).fill('Private work');
  assert.equal(await publish.getByLabel('Show repository link', { exact: false }).count(), 0);
  await publish.getByRole('button', { name: 'Publish', exact: true }).click();
  assert.equal((await rows()).length, 0, 'missing deployed link blocks publishing');
  const url = publish.getByLabel('Deployed project URL');
  await url.fill('https://user:password@demo.example');
  await publish.getByRole('button', { name: 'Publish', exact: true }).click();
  await publish.getByText(/valid HTTP or HTTPS/).waitFor();
  await url.fill('https://demo.example/app');
  await publish.getByRole('button', { name: 'Publish', exact: true }).click();
  await publish.waitFor({ state: 'hidden' });
  assert.equal((await rows()).length, 1);
  await page.getByRole('link', { name: 'Visit Project', exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Visit Project', exact: true }).getAttribute('href'), 'https://demo.example/app');
  await page.getByRole('img', { name: 'Project preview for Private work' }).waitFor();
  assert.equal(await page.locator('[title="Actual GitHub Stars"]').count(), 0);
  assert.equal(gitHubRequests.length, 0, 'manual placeholders never request GitHub covers');
  await page.getByRole('button', { name: 'Edit project details' }).click();
  await page.getByLabel('Deployed project URL').fill('https://demo.example/updated');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.getByRole('link', { name: 'Visit Project', exact: true }).waitFor();
  assert.equal((await rows())[0].deployed_url, 'https://demo.example/updated');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['DashboardView', 'LandingView', 'ExploreView', 'PublicProfileView']) {
      await open(`view=${view}&persist=true`);
      await page.getByText('Private work', { exact: true }).first().waitFor();
      await page.getByRole('img', { name: 'Project preview for Private work' }).first().waitFor();
      if (view === 'ExploreView') await page.getByText('Private work', { exact: true }).last().click();
      const link = page.getByRole('link', { name: 'Visit Project', exact: true }).first();
      await link.waitFor();
      assert.equal(await link.getAttribute('href'), 'https://demo.example/updated');
      await link.focus();
      assert.equal(await link.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator('[title="Actual GitHub Stars"]').count(), 0);
      assert.equal(await page.locator('a[href*="github.com/creator/"]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${view} fits ${width}px`);
    }
  }
  await open('view=DashboardView&persist=true');
  await page.getByRole('button', { name: 'Add Project', exact: true }).click();
  await page.getByRole('button', { name: 'Add from GitHub', exact: true }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).first().click();
  await publish.getByRole('button', { name: 'Publish', exact: true }).click();
  await publish.waitFor({ state: 'hidden' });
  assert.equal((await rows()).length, 2);
  await page.getByRole('button', { name: 'Add Project', exact: true }).click();
  await page.getByRole('button', { name: 'Add project manually' }).click();
  await publish.getByLabel('Project Title', { exact: true }).fill('Retry proof');
  await publish.getByLabel('Deployed project URL').fill('https://retry.example');
  const png = Buffer.from(await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width=128;canvas.height=64;canvas.getContext('2d').fillRect(0,0,128,64);return canvas.toDataURL('image/png').split(',')[1]; }), 'base64');
  await publish.locator('input[type=file]').setInputFiles({ name: 'preview.png', mimeType: 'image/png', buffer: png });
  await page.getByAltText('Screenshot preview').waitFor();
  await page.waitForFunction(() => !document.querySelector('dialog form button[type=submit]').disabled);
  await page.evaluate(() => {
    const read = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function(blob) { FileReader.prototype.readAsDataURL = read; this.onerror(new ProgressEvent('error')); };
  });
  await publish.getByRole('button', { name: 'Publish', exact: true }).click();
  await publish.getByText('Cannot read the preview. Select the file again.', { exact: true }).waitFor();
  const beforeRetry = (await rows()).find(p => p.custom_title === 'Retry proof');
  await publish.getByRole('button', { name: 'Retry upload', exact: true }).click();
  await publish.waitFor({ state: 'hidden' });
  const afterRetry = (await rows()).filter(p => p.custom_title === 'Retry proof');
  assert.equal(afterRetry.length, 1);
  assert.equal(afterRetry[0].id, beforeRetry.id);
  assert.ok(afterRetry[0].screenshot_url.startsWith('data:image/'));
  await page.evaluate(() => localStorage.setItem('gitshowcase_onboarding_draft_creator', JSON.stringify({ step: 2 })));
  await open('view=OnboardingModal&persist=true');
  await page.getByText('1 / 1 GitHub slots selected', { exact: true }).waitFor();
  assert.equal(await page.getByRole('checkbox', { name: /^another / }).isDisabled(), true, 'onboarding counts preserved manual projects');
  await page.getByRole('button', { name: 'Review & Publish' }).click();
  await page.getByRole('button', { name: 'Confirm & Launch Profile' }).click();
  await page.waitForFunction(() => !document.querySelector('#complete-onboarding-btn').disabled);
  assert.equal((await rows()).filter(p => p.source === 'manual').length, 2);
  assert.equal((await rows()).length, 3);
  assert.deepEqual(errors, []);
  console.log('Manual and GitHub publishing, edit, mobile, keyboard, public views, and upload retry passed');
} catch (error) { console.error(await activePage.locator('body').innerText().catch(()=>'Page unavailable')); throw error; } finally { await browser.close(); }
