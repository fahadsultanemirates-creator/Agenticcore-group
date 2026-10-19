import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const token='test-server-credential-with-at-least-forty-characters';
const org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user='11111111-1111-4111-8111-111111111111',id='77777777-7777-4777-8777-777777777777';
const base='https://core.example';let serve,allowMembership=true,uploadPath;
const file={id,organization_id:org,created_by:user,name:'notes.txt',mime:'text/plain',size:12,object_path:org+'/'+user+'/'+id};
globalThis.Deno={env:{get:key=>({SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'server-key',SUPABASE_ANON_KEY:'public-key'}[key])},serve:handler=>serve=handler};
globalThis.fetch=async(url,options)=>{
 if(url.includes('office_chat_server_auth'))return Response.json([{token_hash:createHash('sha256').update(token).digest('hex')}]);
 if(url.endsWith('/auth/v1/user'))return Response.json({id:user,email_confirmed_at:'confirmed'});
 if(url.endsWith('/rpc/reserve_office_chat_file'))return Response.json([file]);
 if(url.includes('/storage/v1/object/upload/sign/')){uploadPath=url;return Response.json({url:'/object/upload/sign/office-chat-files/'+file.object_path+'?token=signed'})}
 if(url.includes('/rest/v1/office_chat_files?'))return Response.json([file]);
 if(url.includes('/rest/v1/office_memberships?'))return Response.json(allowMembership?[{role:'owner'}]:[]);
 if(url.includes('/storage/v1/object/sign/'))return Response.json({signedURL:'/object/sign/office-chat-files/'+file.object_path+'?token=signed'});
 throw Error('Unexpected fetch '+url);
};
await import('../backend/functions/office-chat-store/index.ts');
const req=(operation='file-init',extra={},auth=token)=>new Request(base+'/bridge',{method:'POST',headers:{Authorization:'Bearer client-session','x-office-chat-server-token':auth},body:JSON.stringify({id,organization:org,operation,name:'notes.txt',mime:'text/plain',size:12,...extra})});
let r=await serve(req());assert.equal(r.status,200);assert.equal((await r.json()).id,id);assert.ok(uploadPath.endsWith(file.object_path));assert.ok(!uploadPath.includes('undefined'));
r=await serve(req('file-download'));assert.equal(r.status,200);assert.match((await r.json()).url,/object\/sign\/office-chat-files/);
allowMembership=false;assert.equal((await serve(req('file-download'))).status,403);
assert.equal((await serve(req('file-init',{size:4194305}))).status,400);
assert.equal((await serve(req('file-init',{},'wrong'))).status,403);
console.log('File bridge checks passed: server authentication, reservation response shape, signed upload path, authorized download and membership denial.');
