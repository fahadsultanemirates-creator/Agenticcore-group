const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function main(){
let handler;const calls=[],queue=[];const context={Request,Response,AbortSignal,Set,JSON,Deno:{env:{get:k=>({SUPABASE_URL:'https://core.example',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-only'})[k]},serve:f=>handler=f},fetch:async(url,options)=>{calls.push({url,options});const item=queue.shift();if(!item)throw Error('Unexpected network request');return new Response(JSON.stringify(item.body),{status:item.status})}};
const source=fs.readFileSync(path.resolve(__dirname,'../backend/functions/office-onboard/index.ts'),'utf8');vm.runInNewContext(source,context);
const request=(body,headers={})=>new Request('https://core.example/functions/v1/office-onboard',{method:'POST',headers:{origin:'https://agenticcore-group.netlify.app','content-type':'application/json',...headers},body:JSON.stringify(body)});
assert.equal((await handler(request({name:'Office'}))).status,401);
assert.equal((await handler(request({name:'Office'},{origin:'https://wrong.example',authorization:'Bearer token'}))).status,403);
queue.push({status:401,body:{}});assert.equal((await handler(request({name:'Office'},{authorization:'Bearer invalid'}))).status,401);
queue.push({status:200,body:{id:'real-user',email_confirmed_at:null}});assert.equal((await handler(request({name:'Office'},{authorization:'Bearer token'}))).status,403);
queue.push({status:200,body:{id:'real-user',email_confirmed_at:'confirmed',is_anonymous:false}},{status:200,body:'office-id'});
const response=await handler(request({name:' Office ',user_id:'forged-user'},{authorization:'Bearer valid'}));assert.equal(response.status,200);
assert.deepEqual(JSON.parse(calls.at(-1).options.body),{p_user_id:'real-user',p_name:'Office'});
assert.equal(calls.at(-1).options.headers.Authorization,'Bearer server-only');
assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://agenticcore-group.netlify.app');
assert.ok(!(await response.text()).includes('server-only'));
console.log('Onboarding endpoint checks passed: origin, invalid session, verified email, server-derived identity and secret isolation.');
}
main().catch(e=>{console.error(e);process.exit(1)});
