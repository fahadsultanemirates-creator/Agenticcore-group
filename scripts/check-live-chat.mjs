import assert from 'node:assert/strict';
import { createChatHandler } from '../netlify/lib/chat-handler.mjs';
import office from '../dist/office-model.js';
import packages from '../dist/owned-office-model.js';
import guide from '../dist/office-assistant-model.js';
const organization='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',id='55555555-5555-4555-8555-555555555555';
const suggestion={route:'managed',departments:['marketing'],level:'essential',packageId:'starter',goals:'Prepare social posts'};
const payload={organization,id,character:'maya',text:'Help with social posts'};
const env=k=>({OPENAI_API_KEY:'server-api-secret',OFFICE_CHAT_SERVER_TOKEN:'server-bridge-secret'}[k]);
function setup({fileBytes=null,reserve={id,reused:false,history:[],business:'Example',projects:[],requests:[]},bridgeStatus=200,providerError=false,finishStatus=200,output={reply:'Let’s plan your marketing department.',suggestion}}={}){
 const calls=[];let providerCalls=0,providerArgs;
 const handler=createChatHandler({env,office,packages,guide,fetcher:async(url,options)=>{if(options?.method!=='POST')return new Response(fileBytes);const body=JSON.parse(options.body);calls.push(body);assert.equal(options.headers['x-office-chat-server-token'],'server-bridge-secret');return Response.json(body.operation==='reserve'?reserve:finishStatus!==200?{error:'Active package required for Forge'}:{saved:true},{status:body.operation==='reserve'?bridgeStatus:body.operation==='finish'?finishStatus:200})},client:()=>({responses:{create:async args=>{providerCalls++;providerArgs=args;if(providerError)throw Object.assign(Error('secret provider details: server-api-secret'),{status:401});return {status:'completed',model:'gpt-5-mini',output_text:JSON.stringify(output),usage:{input_tokens:100,output_tokens:50}}}}})});
 return {handler,calls,count:()=>providerCalls,args:()=>providerArgs};
}
const request=(p=payload,headers={})=>new Request('https://agenticcore.group/api/office-chat',{method:'POST',headers:{Authorization:'Bearer user-session','Content-Type':'application/json',...headers},body:JSON.stringify(p)});
{
 const s=setup();const r=await s.handler(new Request('https://agenticcore.group/api/office-chat'));assert.equal(r.status,200);const body=await r.text();assert.ok(!body.includes('server-api-secret'));assert.match(body,/configured/);assert.equal(JSON.parse(body).apiKeyConfigured,true);assert.equal(JSON.parse(body).storageTokenConfigured,true);
 assert.equal((await s.handler(request(payload,{Authorization:''}))).status,401);assert.equal(s.count(),0);
 assert.equal((await s.handler(request(payload,{Origin:'https://other.example'}))).status,403);
 assert.equal((await s.handler(request({...payload,character:'unknown'}))).status,400);
 assert.equal((await s.handler(request({...payload,text:'x'.repeat(2100)}))).status,400);
 assert.equal((await s.handler(request(null))).status,400);
}
{
 const handler=createChatHandler({env:k=>k==='OPENAI_API_KEY'?'private-value':undefined,office,packages,guide,client:()=>{throw Error('not called')}});
 const data=await (await handler(new Request('https://agenticcore.group/api/office-chat'))).json();assert.deepEqual(data,{configured:false,apiKeyConfigured:true,storageTokenConfigured:false});
}
for(const [status,error]of [[401,'Sign in again'],[403,'Business access required'],[403,'Active package required for Forge'],[429,'Daily chat allowance reached']]){
 const s=setup({bridgeStatus:status,reserve:{error}});assert.equal((await s.handler(request({...payload,character:'forge'}))).status,status);assert.equal(s.count(),0);
}
{
 const s=setup();const r=await s.handler(request());assert.equal(r.status,200);assert.equal((await r.json()).reply,'Let’s plan your marketing department.');assert.equal(s.count(),1);assert.deepEqual(s.calls.map(x=>x.operation),['reserve','finish']);assert.equal(s.args().store,false);assert.equal(s.calls[1].input_tokens,100);assert.ok(s.args().instructions.includes('You cannot execute tasks'));assert.equal(s.args().text.format.strict,true);
}
{
 const s=setup({reserve:{id,reused:true,state:'complete',reply:'Previously saved reply',suggestion}});assert.equal((await s.handler(request())).status,200);assert.equal(s.count(),0);
}
{
 const s=setup({reserve:{id,reused:true,state:'pending'}});assert.equal((await s.handler(request())).status,409);assert.equal(s.count(),0);
}
{
 const s=setup({providerError:true});const r=await s.handler(request());assert.equal(r.status,503);assert.ok(!(await r.text()).includes('server-api-secret'));assert.deepEqual(s.calls.map(x=>x.operation),['reserve','fail']);
}
{
 const s=setup({finishStatus:403});const r=await s.handler(request());assert.equal(r.status,403);assert.ok(!(await r.text()).includes('Let’s plan'));assert.deepEqual(s.calls.map(x=>x.operation),['reserve','finish','fail']);
}
{
 const s=setup({output:{reply:'Something',suggestion:{...suggestion,departments:['invented']}}});assert.equal((await s.handler(request())).status,503);assert.equal(s.calls.at(-1).operation,'fail');
}
{
 const bytes=Buffer.from('Business facts supplied by client');
 const file={id:'77777777-7777-4777-8777-777777777777',name:'notes.txt',mime:'text/plain',size:bytes.length,url:'https://pdaluprahifdejsjwjoi.supabase.co/storage/v1/object/sign/office-chat-files/path?token=short-lived'};
 const s=setup({fileBytes:bytes,reserve:{id,reused:false,history:[],business:'Example',projects:[],requests:[],files:[file]}});
 assert.equal((await s.handler(request({...payload,files:[file.id]}))).status,200);
 const input=s.args().input.at(-1).content;assert.equal(input[0].type,'input_text');assert.match(input[1].text,/Business facts supplied by client/);assert.ok(!JSON.stringify(s.args()).includes('token=short-lived'));
}
console.log('Live chat checks passed: authentication and package denials, limits, validated suggestions, persistence, safe errors, replay protection and access revocation before reply release.');
