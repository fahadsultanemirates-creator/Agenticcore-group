import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,service),bucket='office-deliveries';
const headers={'Access-Control-Allow-Origin':'https://agenticcore.group','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
function uuid(value:unknown):value is string{return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}
function checked<T>(r:{data:T,error:unknown}):NonNullable<T>{if(r.error)throw Error('Database operation failed');return r.data as NonNullable<T>}
async function trusted(req:Request){const key=req.headers.get('x-framework-key');if(!key||key.length<32)return false;const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));const hash=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');const {data}=await db.from('framework_bridge_access').select('key_hash').eq('id','click').maybeSingle();return data?.key_hash===hash}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{if(Number(req.headers.get('content-length')||0)>22000000)return reply({error:'File too large'},413);const b=await req.json();
 if(b.action==='download'){
 const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return reply({error:'Sign in'},401);const {data:{user}}=await db.auth.getUser(token);if(!user)return reply({error:'Sign in'},401);
 if(!uuid(b.id))return reply({error:'Invalid delivery'},400);const d=checked(await db.from('office_deliverables').select('organization_id,storage_path').eq('id',b.id).single());
 const {data:member}=await db.from('office_memberships').select('role').eq('organization_id',d.organization_id).eq('user_id',user.id).maybeSingle();if(!member||!d.storage_path)return reply({error:'Delivery unavailable'},403);
 const signed=checked(await db.storage.from(bucket).createSignedUrl(d.storage_path,300));return reply({url:signed.signedUrl});
 }
 if(!await trusted(req))return reply({error:'Unauthorized'},401);
 if(b.action==='pull')return reply({events:checked(await db.rpc('claim_framework_events'))});
 if(b.action==='ack'){if(!uuid(b.id))return reply({error:'Invalid event'},400);checked(await db.from('framework_events').update({delivered_at:new Date().toISOString()}).eq('id',b.id));return reply({ok:true})}
 if(b.action==='orders')return reply({orders:checked(await db.from('office_orders').select('id,configuration,status,fulfillment_status,total_cents,due_cents,payment_method,requirements').order('created_at',{ascending:false}).limit(20))});
 if(b.action==='pending_payments')return reply({orders:checked(await db.from('office_orders').select('id,payment_method,expected_amount').eq('status','awaiting_payment').not('expected_amount','is',null).order('created_at').limit(100))});
 if(!uuid(b.orderId))return reply({error:'Invalid order'},400);const order=checked(await db.from('office_orders').select('*').eq('id',b.orderId).single());
 if(b.action==='paid'){if(typeof b.txHash!=='string'||!/^0x[0-9a-f]{64}$/.test(b.txHash))return reply({error:'Invalid transaction'},400);return reply({credited:checked(await db.rpc('settle_framework_order',{p_order_id:order.id,p_tx_hash:b.txHash}))})}
 if(b.action==='progress'){if(!['pending','in_progress','needs_information'].includes(b.status))return reply({error:'Invalid progress'},400);checked(await db.from('office_orders').update({fulfillment_status:b.status}).eq('id',order.id));return reply({ok:true})}
 if(b.action==='deliver'){
 if(typeof b.eventId!=='string'||!/^tg:\d+:\d+$/.test(b.eventId))return reply({error:'Invalid delivery reference'},400);
 const {data:existing}=await db.from('office_deliverables').select('id').eq('bridge_event_id',b.eventId).maybeSingle();if(existing)return reply({ok:true,id:existing.id,duplicate:true});
 if(typeof b.base64!=='string'||b.base64.length>21000000||typeof b.filename!=='string')return reply({error:'Attach a file up to 15 MB'},400);
 const bytes=Uint8Array.from(atob(b.base64),c=>c.charCodeAt(0));if(!bytes.length||bytes.length>15728640)return reply({error:'Invalid file size'},400);
 const filename=b.filename.replace(/[^a-zA-Z0-9_.-]/g,'_').slice(-120)||'delivery.bin';
 const path=order.organization_id+'/'+order.id+'/'+b.eventId.replaceAll(':','-')+'/'+filename;
 const upload=await db.storage.from(bucket).upload(path,bytes,{contentType:'application/octet-stream',upsert:true});if(upload.error)throw Error('File upload failed');
 const deliveryId=checked(await db.rpc('record_framework_delivery',{p_order_id:order.id,p_event_id:b.eventId,p_path:path,p_filename:filename}));return reply({ok:true,id:deliveryId});
 }
 return reply({error:'Unknown action'},400);
 }catch(e){console.error('framework-bridge operation failed',e instanceof Error?e.message:'unknown');return reply({error:e instanceof Error?e.message:'Bridge operation failed'},400)}
});
