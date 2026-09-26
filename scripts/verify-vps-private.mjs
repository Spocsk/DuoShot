/** Destructive cleanup of synthetic data only. Refuses targets with existing users. Run on the private Docker network or SSH loopback tunnels; never on live source. */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import sharp from 'sharp';
import JSZip from 'jszip';
assert.equal(process.env.DUOSHOT_ALLOW_FRESH_TARGET_TEST,'true');
const base=process.env.DUOSHOT_TEST_BASE_URL;
assert(['127.0.0.1','web-i9qtpe5bpyig86s1aljxr5gv'].includes(new URL(base).hostname));
const internal=process.env.SUPABASE_INTERNAL_URL;
assert(['127.0.0.1','api-gw'].includes(new URL(internal).hostname));
assert.equal(process.env.STRIPE_CHECKOUT_ENABLED,'false');
const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin=createClient(internal,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const initial=await admin.auth.admin.listUsers({page:1,perPage:1});
assert.ifError(initial.error); assert.equal(initial.data.users.length,0,'Only run on a fresh private target');
const analyticsIds=(process.env.DUOSHOT_TEST_ANALYTICS_USER_IDS??'').split(',').filter(Boolean);
assert(analyticsIds.length<=2);
for(const id of analyticsIds)assert((process.env.ANALYTICS_INTERNAL_USER_IDS??'').split(',').includes(id),'Synthetic analytics users must be classified internal');
const run=randomUUID(); const users=[]; const reviewIds=[];
const source=await sharp(randomBytes(400*300*3),{raw:{width:400,height:300,channels:3}}).png().toBuffer();
async function user(plan='free'){
 const email=`vps-check-${run}-${users.length}@example.invalid`, password=randomBytes(32).toString('base64url');
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,...(analyticsIds[users.length]?{id:analyticsIds[users.length]}:{})}); assert.ifError(created.error);
 const u={id:created.data.user.id,cookies:new Map(),paths:[]}; users.push(u);
 const membership=await admin.from('workspace_members').select('workspace_id').eq('user_id',u.id).single(); assert.ifError(membership.error); u.workspace=membership.data.workspace_id;
 if(plan!=='free'){const change=await admin.from('workspaces').update({manual_plan:plan}).eq('id',u.workspace);assert.ifError(change.error);}
 u.client=createServerClient(internal,pub,{cookieOptions:{name:'sb-api-auth-token'},cookies:{getAll:()=>[...u.cookies].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>u.cookies.set(name,value))}});
 const signed=await u.client.auth.signInWithPassword({email,password}); assert.ifError(signed.error);
 if(analyticsIds.includes(u.id))assert.ifError((await u.client.from('consent_events').insert({user_id:u.id,kind:'analytics',accepted:true,policy_version:'2026-09-26'})).error);
 for(const side of ['outer','inner']){const path=`${u.id}/${run}/${side}.png`;const uploaded=await u.client.storage.from('uploads').upload(path,source,{contentType:'image/png'});assert.ifError(uploaded.error);u.paths.push(path);}
 u.request=(path,options={})=>fetch(base+path,{...options,headers:{...options.headers,cookie:[...u.cookies].map(([k,v])=>`${k}=${v}`).join('; ')},signal:AbortSignal.timeout(100_000)});
 return u;
}
const post=(body)=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const body=(u,count=1,format='jpeg')=>({outerPaths:Array(count).fill(u.paths[0]),innerPaths:Array(count).fill(u.paths[1]),appName:'VPS synthetic acceptance',assumeCloneRisk:true,options:{orientation:'landscape',format,fit:'cover'}});
const privateUrl=(url)=>{const parsed=new URL(url);assert.equal(parsed.origin,process.env.NEXT_PUBLIC_SUPABASE_URL);return internal+parsed.pathname+parsed.search;};
async function render(u,count=1,format='jpeg'){
 const start=Date.now(); const response=await u.request('/api/export',post(body(u,count,format))); const payload=await response.json();
 if(response.status!==200)return {status:response.status,error:payload.error,ms:Date.now()-start};
 const renderMs=Date.now()-start;
 if(count===10) console.log(JSON.stringify({test:'large_zip_render_finished',renderMs}));
 const zipResponse=await fetch(privateUrl(payload.url));assert.equal(zipResponse.status,200);
 const bytes=Buffer.from(await zipResponse.arrayBuffer()); const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});
 const images=Object.entries(zip.files).filter(([p])=>/\.(png|jpg)$/.test(p));assert.equal(images.length,count*2);
 const meta=await sharp(await images[0][1].async('nodebuffer')).metadata();assert.equal(meta.format,format==='png'?'png':'jpeg');
 return {status:200,ms:Date.now()-start,renderMs,bytes:bytes.length,exportId:payload.exportId,images:images.length};
}
try {
 const free=await user(); const result=await render(free,10);assert.equal(result.status,200,JSON.stringify(result));assert(result.bytes>4_500_000);console.log(JSON.stringify({test:'free_20_image_zip',...result}));
 const recover=await free.request(`/api/exports/${result.exportId}/download?format=json`);assert.equal(recover.status,200);assert.equal((await free.request('/api/billing/status').then(r=>r.json())).remainingFreeExports,1);
 assert.equal((await fetch(base+`/api/exports/${result.exportId}/download`)).status,401);
 const studio=await user('studio');assert.equal((await studio.request(`/api/exports/${result.exportId}/download`)).status,404);
 const foreign=await studio.request('/api/export',post(body(free)));assert.equal(foreign.status,403);
 const created=await studio.request('/api/reviews',post({...body(studio),locale:'fr'}));const review=await created.json();assert.equal(created.status,200,JSON.stringify(review));reviewIds.push(review.id);
 const read=await fetch(base+`/api/reviews/${review.id}`).then(r=>r.json());assert.equal(read.slides.length,1);
 const media=base+read.slides[0].outer;assert.equal((await fetch(media)).status,200);
 assert.equal((await free.request(`/api/reviews/${review.id}`,{method:'DELETE'})).status,404);
 assert.equal((await studio.request(`/api/reviews/${review.id}`,{method:'DELETE'})).status,200);
 assert.equal((await fetch(media)).status,410);
 console.log(JSON.stringify({test:'auth_isolation_review_revoke',passed:true}));
 const pool=[studio];for(let i=1;i<50;i++)pool.push(await user('studio'));
 for(const n of [5,15,30,50]){
  const start=Date.now();const settled=await Promise.allSettled(pool.slice(0,n).map(u=>render(u)));
  const results=settled.map(r=>r.status==='fulfilled'?r.value:{status:0,error:r.reason?.message??'NETWORK_ERROR',ms:Date.now()-start});
  const times=results.map(r=>r.renderMs??r.ms).sort((a,b)=>a-b);
  const summary={test:'parallel_personalized_zip',users:n,success:results.filter(r=>r.status===200).length,failures:results.filter(r=>r.status!==200),p95ms:times[Math.ceil(n*.95)-1],maxms:times.at(-1),wallMs:Date.now()-start};console.log(JSON.stringify(summary));
  if(summary.success!==n){process.exitCode=1;break;}
 }
} finally {
 for(const id of reviewIds){const list=await admin.storage.from('reviews').list(id,{limit:100});if(list.data?.length)assert.ifError((await admin.storage.from('reviews').remove(list.data.map(x=>`${id}/${x.name}`))).error);}
 for(const u of users){
  if(u.paths.length)assert.ifError((await admin.storage.from('uploads').remove(u.paths)).error);
  const list=await admin.storage.from('exports').list(u.id,{limit:100});if(list.data?.length)assert.ifError((await admin.storage.from('exports').remove(list.data.map(x=>`${u.id}/${x.name}`))).error);
  if(u.workspace)assert.ifError((await admin.from('workspaces').delete().eq('id',u.workspace)).error);
  assert.ifError((await admin.auth.admin.deleteUser(u.id)).error);
 }
 console.log(JSON.stringify({test:'synthetic_cleanup',users:users.length,completed:true}));
}
