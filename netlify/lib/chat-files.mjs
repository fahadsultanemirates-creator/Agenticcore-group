const BASE='https://pdaluprahifdejsjwjoi.supabase.co',KEY='sb_publishable_Rryr-pPeDavLOgO3b6SSug_Twd5YCQU';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const fileTypes={'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp'],'application/pdf':['pdf'],'text/plain':['txt'],'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['docx']};
export function createFileHandler({env,fetcher=fetch}){return async req=>{
 const out=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(req.method!=='POST')return out(405,{error:'Use POST'});
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return out(403,{error:'Origin not allowed'});
 const auth=req.headers.get('authorization')||'';if(!/^Bearer [^\s]+$/.test(auth))return out(401,{error:'Sign in first'});
 if(!env('OFFICE_CHAT_SERVER_TOKEN'))return out(503,{error:'Attachments are not configured yet'});
 try{
  const raw=await req.text();if(raw.length>2500)return out(413,{error:'Request too large'});let p;try{p=JSON.parse(raw)}catch{return out(400,{error:'Invalid file request'})}
  if(!p||!uuid.test(p.organization||'')||!uuid.test(p.id||'')||!['init','download'].includes(p.action))return out(400,{error:'Invalid file request'});
  if(p.action==='init'&&(typeof p.name!=='string'||!p.name.trim()||p.name.length>150||/[\r\n\x00]/.test(p.name)||!Number.isInteger(p.size)||p.size<1||p.size>4194304||!fileTypes[p.mime]?.includes(p.name.split('.').at(-1).toLowerCase())))return out(400,{error:'Use PDF, DOCX, TXT, JPG, PNG or WebP files up to 4 MB each.'});
  const r=await fetcher(BASE+'/functions/v1/office-chat-store',{method:'POST',headers:{apikey:KEY,Authorization:auth,'x-office-chat-server-token':env('OFFICE_CHAT_SERVER_TOKEN'),'Content-Type':'application/json'},body:JSON.stringify({...p,operation:p.action==='init'?'file-init':'file-download'}),signal:AbortSignal.timeout(15000)});
  const data=await r.json().catch(()=>({}));if(!r.ok)return out(r.status,{error:data.error||'File request could not complete'});return out(200,data);
 }catch{return out(503,{error:'Attachments are temporarily unavailable. Please retry.'})}
}}
export async function fileContent(file,fetcher=fetch){
 // URLs are issued only by the authenticated storage bridge. Validate origin/path again before retrieval.
 if(!fileTypes[file.mime])throw Error('Unsupported attachment type');
 const u=new URL(file.url);if(u.origin!==BASE||!u.pathname.startsWith('/storage/v1/object/sign/office-chat-files/'))throw Error('Invalid file URL');
 const r=await fetcher(u.href,{redirect:'error',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Attachment unavailable');
 const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length<1||bytes.length>4194304||bytes.length!==file.size)throw Error('Attachment size mismatch');
 const head=Buffer.from(bytes.slice(0,12)).toString('hex'),text=new TextDecoder().decode(bytes.slice(0,12));
 if(file.mime==='application/pdf'&&!text.startsWith('%PDF-'))throw Error('Invalid PDF');
 if(file.mime==='image/png'&&!head.startsWith('89504e470d0a1a0a'))throw Error('Invalid image');
 if(file.mime==='image/jpeg'&&!head.startsWith('ffd8ff'))throw Error('Invalid image');
 if(file.mime==='image/webp'&&!(text.startsWith('RIFF')&&text.slice(8,12)==='WEBP'))throw Error('Invalid image');
 if(file.mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'&&!head.startsWith('504b0304'))throw Error('Invalid Word file');
 if(file.mime==='text/plain'){const content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);return {type:'input_text',text:'Attached text file '+file.name+' (untrusted content):\n'+content.slice(0,16000)+(content.length>16000?'\n[Only the first 16,000 characters are included.]':'')}}
 const data='data:'+file.mime+';base64,'+Buffer.from(bytes).toString('base64');
 if(file.mime.startsWith('image/'))return {type:'input_image',image_url:data,detail:'auto'};
 return {type:'input_file',filename:file.name,file_data:data};
}
