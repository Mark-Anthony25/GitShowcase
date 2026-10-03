import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const baseURL=process.env.IMAGE_TEST_URL || 'http://localhost:3000';
const checks=[];let activePage;let pageErrors=[];
try {
const page=await browser.newPage();activePage=page;page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>{errors.push(e.message);pageErrors.push(e.message);});
await page.route('**/src/context/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:`const state={user:{id:'11111111-1111-4111-8111-111111111111',user_metadata:{}},profile:{github_username:'validation',full_name:'Validation'},githubToken:null,signInWithGitHub:async()=>{}};export function useAuth(){return state;}`}));
await page.route('**/src/lib/supabase.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const supabase=null,isSupabaseConfigured=false,supabaseAnonKey='',supabaseUrl='';`}));
await page.route('**/src/lib/github.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const getValidToken=()=>null;export async function fetchUserRepos(){return [{id:1,name:'preview-proof',full_name:'validation/preview-proof',html_url:'https://github.com/validation/preview-proof',description:'Validation fixture',stargazers_count:0,forks_count:0,language:'TypeScript'}];}export async function fetchLiveRepoStats(){return {stars:0,forks:0,language:'TypeScript',description:'Validation fixture',topics:[]};}`}));
await page.route('**/__preview_validation',r=>r.fulfill({contentType:'text/html',body:`<html><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;
const rm=await import('/node_modules/.vite/deps/react.js');const React=rm.default??rm;const cm=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=cm.createRoot??cm.default.createRoot;const {DashboardView}=await import('/src/components/DashboardView.tsx');createRoot(document.getElementById('root')).render(React.createElement(DashboardView,{navigate:()=>{}}));
</script></body></html>`}));
await page.addInitScript(()=>{
 window.__activePreviewUrls=new Set();window.__previewUrlKinds=new Map();const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
 URL.createObjectURL=blob=>{const url=create(blob);window.__activePreviewUrls.add(url);window.__previewUrlKinds.set(url,{type:blob.type,size:blob.size});return url;};
 URL.revokeObjectURL=url=>{window.__activePreviewUrls.delete(url);revoke(url);};
});
await page.goto(baseURL+'/__preview_validation');
await page.getByRole('button',{name:'Add Projects from GitHub',exact:true}).click(); await page.getByRole('button',{name:'Publish',exact:true}).waitFor();
await page.getByRole('button',{name:'Publish',exact:true}).click();
await page.locator('input[type=file]').waitFor();
for (const [name,mimeType,buffer,message] of [
 ['phone.heic','image/heic',Buffer.from('heic'),'Unsupported format. Use JPG, PNG, or WebP.'],
 ['large.jpg','image/jpeg',Buffer.alloc(20*1024*1024),'Image is too large (max 10MB).'],
 ['text.png','image/png',Buffer.from('text'),'This file is not a valid JPG, PNG, or WebP image. Check its format.']
]) {
 await page.locator('input[type=file]').setInputFiles({name,mimeType,buffer});
 await page.getByText(message,{exact:true}).waitFor();
 assert.equal(await page.locator('form').getByRole('button',{name:'Publish',exact:true}).isDisabled().catch(()=>false),false);
 checks.push(`${name}: explicit error and recovered form`);
}
const png=Buffer.from(await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=256;c.height=128;c.getContext('2d').fillRect(0,0,256,128);return c.toDataURL('image/png').split(',')[1];}),'base64');
await page.locator('input[type=file]').setInputFiles({name:'valid.png',mimeType:'image/png',buffer:png});
await page.getByAltText('Screenshot preview').waitFor();
await page.getByText(/saved\)/).waitFor();
await page.locator('form').getByRole('button',{name:'Publish',exact:true}).click();
await page.getByText('Preview Proof',{exact:true}).waitFor();
const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('gitshowcase_projects')));
assert.equal(stored.length,1);assert.match(stored[0].screenshot_url,/^data:image\/(webp|png|jpeg);base64,/);
checks.push('sandbox publish: compressed data URL persisted');
await page.waitForFunction(()=>Array.from(window.__activePreviewUrls).every(url=>!window.__previewUrlKinds.get(url).type.startsWith('image/')));
checks.push('publish releases image preview URLs');
await page.getByRole('button',{name:'Edit project details'}).click();
await page.locator('form input[type=text]').fill('Quota proof');
await page.locator('input[type=file]').setInputFiles({name:'valid.png',mimeType:'image/png',buffer:png});
await page.getByText(/saved\)/).waitFor();
await page.evaluate(()=>{window.__nativeSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='gitshowcase_projects')throw new DOMException('Full','QuotaExceededError');return window.__nativeSetItem.call(this,key,value);};});
await page.getByRole('button',{name:'Save Changes',exact:true}).click();
await page.getByRole('alert').filter({hasText:'Failed to save project. Please retry.'}).waitFor();
assert.equal(await page.getByRole('button',{name:'Retry save',exact:true}).isEnabled(),true);
assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('gitshowcase_projects'))))[0].custom_title,'Preview Proof');
checks.push('quota exception is caught, previous persisted project stays intact');
await page.evaluate(()=>{Storage.prototype.setItem=window.__nativeSetItem;});
await page.getByRole('button',{name:'Retry save',exact:true}).click();
await page.getByText('Edit Project Details',{exact:true}).waitFor({state:'hidden'});
await page.getByText('Quota proof',{exact:true}).waitFor();
await page.waitForFunction(()=>Array.from(window.__activePreviewUrls).every(url=>!window.__previewUrlKinds.get(url).type.startsWith('image/')));
checks.push('quota recovery retry succeeds and releases preview URLs');
console.log(JSON.stringify({checks,pageErrors:errors,body:(await page.locator('body').innerText()).slice(-2200)},null,2));
}catch(error){console.log(JSON.stringify({error:String(error),pageErrors,checks,activeUrls:await activePage?.evaluate(()=>Array.from(window.__activePreviewUrls).map(url=>({url,...window.__previewUrlKinds.get(url)}))),body:await activePage?.locator('body').innerText({timeout:1500}).catch(()=>'<unavailable>')},null,2));process.exitCode=1;}finally {await browser.close();}
