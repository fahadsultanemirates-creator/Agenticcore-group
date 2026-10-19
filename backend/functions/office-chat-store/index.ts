// Internal persistence bridge. Both the signed-in user and Netlify's server credential are verified.
const base=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
async function db(path:string,options:RequestInit={}){
 const r=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json',...(options.headers||{})},signal:AbortSignal.timeout(8000)});
 const data=await r.json().catch(()=>null);if(!r.ok)throw Object.assign(new Error('Storage unavailable'),{data});return data;
}
async function signedFile(file:any){
 const r=await fetch(base+'/storage/v1/object/sign/office-chat-files/'+file.object_path,{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:120}),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('File unavailable');const v=await r.json();const path=v.signedURL||v.signedUrl;return {id:file.id,name:file.name,mime:file.mime,size:file.size,url:base+'/storage/v1'+path};
}
Deno.serve(async req=>{
 const out=(status:number,data:unknown)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(req.method!=='POST')return out(405,{error:'Use POST'});
 try{
  const token=req.headers.get('x-office-chat-server-token')||'';
  if(token.length<40||token.length>200)return out(403,{error:'Server authorization required'});
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const keys=await db('office_chat_server_auth?select=token_hash&id=eq.true');if(keys[0]?.token_hash!==digest)return out(403,{error:'Server authorization required'});
  const auth=req.headers.get('authorization')||'';if(!/^Bearer [^\s]+$/.test(auth))return out(401,{error:'Sign in first'});
  const r=await fetch(base+'/auth/v1/user',{headers:{apikey:anon,Authorization:auth},signal:AbortSignal.timeout(8000)});
  if(!r.ok)return out(401,{error:'Sign in again'});const user=await r.json();if(!user.id||!user.email_confirmed_at||user.is_anonymous)return out(403,{error:'A verified account is required'});
  const raw=await req.text();if(raw.length>20000)return out(413,{error:'Request too large'});let p;try{p=JSON.parse(raw)}catch{return out(400,{error:'Invalid request'})}
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(p.organization||'')||!uuid.test(p.id||''))return out(400,{error:'Invalid business or request'});
  if(p.operation==='file-init'){
   const types:Record<string,string[]>={'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp'],'application/pdf':['pdf'],'text/plain':['txt'],'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['docx']};
   if(typeof p.name!=='string'||p.name.length<1||p.name.length>150||/[\r\n\x00]/.test(p.name)||!types[p.mime]?.includes(p.name.split('.').at(-1).toLowerCase())||!Number.isInteger(p.size)||p.size<1||p.size>4194304)return out(400,{error:'Invalid attachment type or size'});
   const reservedFile=await db('rpc/reserve_office_chat_file',{method:'POST',body:JSON.stringify({p_id:p.id,p_org:p.organization,p_user:user.id,p_name:p.name,p_mime:p.mime,p_size:p.size})});const file=Array.isArray(reservedFile)?reservedFile[0]:reservedFile;if(!file?.object_path)throw Error('Upload reservation unavailable');
   const upload=await fetch(base+'/storage/v1/object/upload/sign/office-chat-files/'+file.object_path,{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({upsert:false}),signal:AbortSignal.timeout(8000)});if(!upload.ok)throw Error('Upload unavailable');const signed=await upload.json();
   return out(200,{id:file.id,name:file.name,mime:file.mime,size:file.size,uploadUrl:base+'/storage/v1'+signed.url});
  }
  if(p.operation==='file-download'){
   const files=await db('office_chat_files?select=*&id=eq.'+p.id+'&organization_id=eq.'+p.organization+'&created_by=eq.'+user.id);
   const membership=await db('office_memberships?select=role&organization_id=eq.'+p.organization+'&user_id=eq.'+user.id);if(!files.length||!membership.length)return out(403,{error:'Attachment access required'});return out(200,await signedFile(files[0]));
  }
  if(p.operation==='reserve'){
   if(typeof p.text!=='string'||!p.text.trim()||p.text.length>2000||!['forge','maya','atlas','nova','leo','iris','ledger','sage','orion','amara'].includes(p.character))return out(400,{error:'Invalid message'});
   const ids=p.files||[];if(!Array.isArray(ids)||ids.length>3||ids.some((id:string)=>!uuid.test(id))||new Set(ids).size!==ids.length)return out(400,{error:'Choose up to three attachments'});
   const reservation=await db('rpc/reserve_office_chat',{method:'POST',body:JSON.stringify({p_id:p.id,p_org:p.organization,p_user:user.id,p_character:p.character,p_text:p.text.trim()})});
   await db('rpc/link_office_chat_files',{method:'POST',body:JSON.stringify({p_turn:p.id,p_org:p.organization,p_user:user.id,p_ids:ids,p_reused:reservation.reused})});
   if(reservation.reused)return out(200,reservation);
   const filter='organization_id=eq.'+p.organization;
   const [history,org,projects,requests]=await Promise.all([
    db('office_chat_turns?select=user_text,reply,office_chat_files(id,name)&'+filter+'&created_by=eq.'+user.id+'&character=eq.'+p.character+'&state=eq.complete&order=created_at.desc&limit=8'),
    db('office_organizations?select=name&id=eq.'+p.organization),
    db('office_projects?select=title,status,department&'+filter+'&order=created_at.desc&limit=10'),
    db('office_requests?select=status,route,brief&'+filter+'&order=created_at.desc&limit=5')]);
   const fileRows=ids.length?await db('office_chat_files?select=*&id=in.('+ids.join(',')+')&created_by=eq.'+user.id+'&organization_id=eq.'+p.organization):[];const files=await Promise.all(fileRows.map(signedFile));
   return out(200,{...reservation,files,history:history.reverse(),business:org[0]?.name,projects,requests:requests.map((v:any)=>({status:v.status,route:v.route,title:v.brief?.title,text:String(v.brief?.text||'').slice(0,1500)}))});
  }
  if(!['finish','fail'].includes(p.operation))return out(400,{error:'Unknown operation'});
  const turns=await db('office_chat_turns?select=id,character,state&'+('id=eq.'+p.id)+'&organization_id=eq.'+p.organization+'&created_by=eq.'+user.id);
  if(!turns.length)return out(404,{error:'Conversation not found'});
  const member=await db('office_memberships?select=role&organization_id=eq.'+p.organization+'&user_id=eq.'+user.id);if(!member.length)return out(403,{error:'Business access changed'});
  if(turns[0].character==='forge'){
   const packages=await db('office_package_access?select=enabled,starts_at,ends_at&organization_id=eq.'+p.organization);
   if(!packages.some((x:any)=>x.enabled&&Date.parse(x.starts_at)<=Date.now()&&Date.parse(x.ends_at)>Date.now()))return out(403,{error:'Active package required for Forge'});
  }
  if(turns[0].state!=='pending')return out(409,{error:'This message was already finalized'});
  if(p.operation==='finish'&&(typeof p.reply!=='string'||!p.reply.trim()||p.reply.length>12000))return out(400,{error:'Invalid reply'});
  await db('office_chat_turns?id=eq.'+p.id+'&state=eq.pending',{method:'PATCH',body:JSON.stringify(p.operation==='fail'?{state:'failed'}:{state:'complete',reply:p.reply,suggestion:p.suggestion||null,model:String(p.model||'').slice(0,100),input_tokens:Math.max(0,Math.floor(Number(p.input_tokens)||0)),output_tokens:Math.max(0,Math.floor(Number(p.output_tokens)||0))})});
  return out(200,{saved:true});
 }catch(e){
  const msg=String((e as any)?.data?.message||'');
  if(msg.includes('package_required'))return out(403,{error:'Active package required for Forge'});
  if(msg.includes('not_a_member'))return out(403,{error:'Business access required'});
  if(msg.includes('upload_limit'))return out(429,{error:'Your daily upload allowance has been reached. Please try tomorrow.'});
  if(msg.includes('invalid_files'))return out(403,{error:'Attachment not available for this conversation. Please attach it again.'});
  if(msg.includes('daily_limit'))return out(429,{error:'Your daily chat allowance has been reached. Please try tomorrow.'});
  if(msg.includes('slow_down'))return out(429,{error:'Please wait a few seconds before sending another message.'});
  if(msg.includes('request_conflict'))return out(409,{error:'This message reference was already used.'});
  return out(503,{error:'Conversation storage is temporarily unavailable. Please retry.'});
 }
});
