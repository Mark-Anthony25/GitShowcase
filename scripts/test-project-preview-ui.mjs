import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const baseURL=process.env.IMAGE_TEST_URL || 'http://localhost:3000';
const checks=[];let activePage;let pageErrors=[];
try {
const page=await browser.newPage();activePage=page;page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>{errors.push(e.message);pageErrors.push(e.message);});
await page.route('**/src/context/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:`const state={user:{id:'11111111-1111-4111-8111-111111111111',user_metadata:{}},profile:{github_username:'validation',full_name:'Validation'},githubToken:null,signInWithGitHub:async()=>{}};export function useAuth(){return state;}`}));
await page.route('**/src/lib/supabase.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const isSupabaseConfigured=true,supabaseAnonKey='validation',supabaseUrl=location.origin;
const state=window.__previewServer={rows:[],removed:[],writes:[]};
const stats={stars:0,forks:0,language:'TypeScript',topics:[]};
class Query {
 constructor(){this.filters=[];this.action='read';}
 select(){return this;}eq(k,v){this.filters.push([k,v]);return this;}order(){return this;}
 update(values){this.action='update';this.values=values;return this;}delete(){this.action='delete';return this;}
 run(){const matching=state.rows.filter(r=>this.filters.every(([k,v])=>r[k]===v));
 if(this.action==='update'){for(const r of matching)Object.assign(r,this.values);state.writes.push('update');}
 if(this.action==='delete'){state.rows=state.rows.filter(r=>!matching.includes(r));state.writes.push('delete');}
 return {data:matching.map(r=>({...r})),error:null};}
 single(){const r=this.run();return Promise.resolve({...r,data:r.data[0]??null});}maybeSingle(){return this.single();}
 then(resolve,reject){return Promise.resolve(this.run()).then(resolve,reject);}
}
export const supabase={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}})},
 from:()=>new Query(),
 rpc:async(_name,p)=>{let row=state.rows.find(r=>r.repo_full_name===p.p_repo_full_name);if(!row){row={id:'22222222-2222-4222-8222-222222222222',profile_id:'11111111-1111-4111-8111-111111111111',repo_full_name:p.p_repo_full_name,repo_url:p.p_repo_url,custom_title:p.p_custom_title,custom_description:p.p_custom_description,screenshot_url:null,display_order:0,added_at:new Date().toISOString()};state.rows.push(row);}return {data:{...row},error:null};},
 functions:{invoke:async()=>({data:stats,error:null})},
 storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:location.origin+'/storage/v1/object/public/project-screenshots/'+path}}),remove:async paths=>{state.removed.push(...paths);state.writes.push('storage-delete');return {data:paths,error:null};}})}
};`}));
await page.route('**/src/lib/github.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const getValidToken=()=>null;export async function fetchUserRepos(){return [{id:1,name:'preview-proof',full_name:'validation/preview-proof',html_url:'https://github.com/validation/preview-proof',description:'Validation fixture',stargazers_count:0,forks_count:0,language:'TypeScript'}];}export async function fetchLiveRepoStats(){return {stars:0,forks:0,language:'TypeScript',description:'Validation fixture',topics:[]};}`}));
await page.route('**/__preview_validation',r=>r.fulfill({contentType:'text/html',body:`<html><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;
const rm=await import('/node_modules/.vite/deps/react.js');const React=rm.default??rm;const cm=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=cm.createRoot??cm.default.createRoot;const {DashboardView}=await import('/src/components/DashboardView.tsx');createRoot(document.getElementById('root')).render(React.createElement(DashboardView,{navigate:()=>{}}));
</script></body></html>`}));
let attempts=0;
await page.route('**/storage/v1/object/**',async route=>{
 if(route.request().method()==='POST'){
  attempts++;await new Promise(r=>setTimeout(r,250));
  await route.fulfill({status:attempts===1?403:200,contentType:'application/json',body:attempts===1?JSON.stringify({error:'simulated storage policy failure'}):JSON.stringify({Key:'cover'})});
 }else await route.fulfill({status:404,body:'not found'});
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
await page.getByText('Upload failed. Check your connection and sign-in, then retry.',{exact:true}).waitFor();
assert.equal(await page.getByAltText('Screenshot preview').count(),1);
checks.push('failed upload preserves preview and enables retry');
await page.getByRole('button',{name:'Retry upload',exact:true}).click();
await page.getByText('Preview Proof',{exact:true}).waitFor();
let stored=await page.evaluate(()=>window.__previewServer.rows);
assert.equal(stored.length,1);assert.match(stored[0].screenshot_url,/\/cover\?v=[a-f0-9]{64}$/);assert.equal(attempts,2);
checks.push('retry reuses one project, saves content-versioned URL');
await page.getByRole('button',{name:'Edit project details'}).click();
await page.locator('input[type=file]').setInputFiles({name:'replace.png',mimeType:'image/png',buffer:png});
await page.getByText(/saved\)/).waitFor();
await page.getByRole('button',{name:'Save Changes',exact:true}).click();
await page.getByText('Edit Project Details',{exact:true}).waitFor({state:'hidden'});
assert.equal(attempts,3);assert.equal((await page.evaluate(()=>window.__previewServer.rows)).length,1);
checks.push('replace uploads to the same cover');
await page.getByRole('button',{name:'Unpublish project',exact:true}).click();
await page.getByRole('button',{name:'Unpublish Project',exact:true}).click();
await page.getByText('No projects published yet',{exact:true}).waitFor();
stored=await page.evaluate(()=>window.__previewServer);
assert.equal(stored.rows.length,0);assert.ok(stored.removed.some(p=>p.endsWith('/cover')));assert.ok(stored.writes.indexOf('storage-delete')<stored.writes.lastIndexOf('delete'));
checks.push('unpublish calls storage deletion before row deletion');
console.log(JSON.stringify({checks,pageErrors:errors,body:(await page.locator('body').innerText()).slice(-2200)},null,2));
}catch(error){console.log(JSON.stringify({error:String(error),pageErrors,body:await activePage?.locator('body').innerText({timeout:1500}).catch(()=>'<unavailable>')},null,2));process.exitCode=1;}finally {await browser.close();}
