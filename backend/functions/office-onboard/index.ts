const allowedOrigins = new Set(['https://agenticcore-group.netlify.app','https://agenticcore.group','https://www.agenticcore.group']);
Deno.serve(async (req) => {
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowedOrigins.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})};
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!allowedOrigins.has(origin))return reply(403,{error:'Origin not allowed'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'Use POST'});
 if(!/^Bearer [^\s]+$/.test(req.headers.get('authorization')||''))return reply(401,{error:'Sign in first'});
 try{
  const base=Deno.env.get('SUPABASE_URL');
  const anon=Deno.env.get('SUPABASE_ANON_KEY');
  const userResponse=await fetch(base+'/auth/v1/user',{headers:{apikey:anon,Authorization:req.headers.get('authorization')},signal:AbortSignal.timeout(10000)});
  if(!userResponse.ok)return reply(401,{error:'Sign in again'});
  const user=await userResponse.json();
  if(!user.id||!user.email_confirmed_at||user.is_anonymous)return reply(403,{error:'Confirm your email before creating an office'});
  if(Number(req.headers.get('content-length')||0)>2048)return reply(413,{error:'Request too large'});
  const raw=await req.text();if(raw.length>2048)return reply(413,{error:'Request too large'});
  let data;try{data=JSON.parse(raw)}catch{return reply(400,{error:'Invalid request'})}
  if(typeof data.name!=='string'||!data.name.trim()||data.name.trim().length>120)return reply(400,{error:'Enter a business name up to 120 characters'});
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const result=await fetch(base+'/rest/v1/rpc/provision_office',{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:user.id,p_name:data.name.trim()}),signal:AbortSignal.timeout(10000)});
  if(!result.ok)return reply(503,{error:'Office setup could not complete. Please retry.'});
  return reply(200,{organization_id:await result.json()});
 }catch{return reply(503,{error:'Office setup is temporarily unavailable. Please retry.'})}
});
