/** Real HTTP/Supabase/Storage acceptance test. Consumes one trial on a dedicated account. */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import JSZip from 'jszip';
import sharp from 'sharp';
const base = process.env.DUOSHOT_TEST_BASE_URL || 'http://localhost:3001';
const email = process.env.DUOSHOT_TEST_EMAIL;
const password = process.env.DUOSHOT_TEST_PASSWORD;
assert(email && password && process.env.DUOSHOT_TEST_CONSUME_TRIAL === 'true', 'Set dedicated test credentials and DUOSHOT_TEST_CONSUME_TRIAL=true');
const cookies = new Map();
const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: { getAll: () => [...cookies].map(([name,value])=>({name,value})), setAll: values => values.forEach(({name,value})=>cookies.set(name,value)) },
});
const {data:auth,error:authError} = await client.auth.signInWithPassword({email,password});
assert.ifError(authError);
const request = (path, options={}) => fetch(`${base}${path}`, {...options, headers:{...options.headers, cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')}});
const before = await (await request('/api/billing/status')).json();
assert.equal(before.plan,'free','Use an isolated free test account');
assert(before.remainingFreeExports>0);
const run = randomUUID();
// Deliberately incompressible RGB detail exercises the >4.5 MB Storage delivery path.
const sources = await Promise.all(['outer','inner'].map(async(side)=>{
  const png = await sharp(randomBytes(400*300*3),{raw:{width:400,height:300,channels:3}}).png().toBuffer();
  const path=`${auth.user.id}/${run}/${side}.png`;
  const {error}=await client.storage.from('uploads').upload(path,png,{contentType:'image/png'});assert.ifError(error);return path;
}));
const started = Date.now();
const response = await request('/api/export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({outerPaths:Array(10).fill(sources[0]),innerPaths:Array(10).fill(sources[1]),appName:'Real acceptance test',sameSet:false,assumeClone:true,options:{orientation:'landscape',format:'jpeg',fit:'cover'}})});
const exported = await response.json();
assert.equal(response.status,200,JSON.stringify(exported));
assert(exported.exportId && exported.expiresAt);
const refreshed = await request(`/api/exports/${exported.exportId}/download?format=json`);
assert.equal(refreshed.status,200);
const download = await refreshed.json();
const file = await fetch(download.url);assert.equal(file.status,200);
const bytes = Buffer.from(await file.arrayBuffer());assert(bytes.length>4_500_000);
const zip = await JSZip.loadAsync(bytes);
const images=Object.entries(zip.files).filter(([path])=>/\.jpg$/.test(path));assert.equal(images.length,20);
for(const [path,entry]of images){const m=await sharp(await entry.async('nodebuffer')).metadata();assert.equal(m.format,'jpeg');assert.equal(m.space,'srgb');assert.equal(m.hasAlpha,false);assert.deepEqual([m.width,m.height],path.includes('duo-outer')?[2034,1398]:[2853,2007]);}
await request(`/api/exports/${exported.exportId}/download?format=json`);
const after = await (await request('/api/billing/status')).json();assert.equal(after.remainingFreeExports,before.remainingFreeExports-1);
const anonymous=await fetch(`${base}/api/exports/${exported.exportId}/download`);assert.equal(anonymous.status,401);
console.log(JSON.stringify({at:new Date().toISOString(),base,exportId:exported.exportId,bytes:bytes.length,images:images.length,orientation:'landscape',format:'jpeg',durationMs:Date.now()-started,quotaBefore:before.remainingFreeExports,quotaAfter:after.remainingFreeExports,recoveryWithoutNewTrial:true,anonymousDenied:true},null,2));
await client.auth.signOut({ scope: 'local' });
