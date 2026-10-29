(function(root){
const config=root.WorkspaceConfig,key='agenticcore.core.session.v1';let session=null,refreshing=null;
function persist(value){session=value;if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key)}
try{session=JSON.parse(sessionStorage.getItem(key)||'null')}catch{sessionStorage.removeItem(key)}
async function raw(path,options={},auth=false){
 const headers={apikey:config.key,'Content-Type':'application/json',...(auth&&session?{Authorization:'Bearer '+session.access_token}:{}),...options.headers};
 const r=await fetch(config.url+path,{...options,headers,cache:'no-store',signal:AbortSignal.timeout(20000)});
 const body=await r.text();let data;try{data=body?JSON.parse(body):null}catch{data=null}
 if(!r.ok){const error=new Error(data?.msg||data?.error_description||data?.message||data?.error||'Request could not complete. Please retry.');error.status=r.status;error.code=data?.error_code||data?.code;if(r.status===429)error.message='Please wait before trying again. '+error.message+' If you already created an account, check your inbox and spam folder for the confirmation email, then sign in.';throw error}
 return data;
}
function keep(data){if(!data?.access_token||!data?.refresh_token)throw new Error('A valid session was not returned.');persist({...data,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)});return data}
async function fresh(){
 if(!session)return;
 if(session.expires_at>Date.now()/1000+60)return;
 if(!refreshing)refreshing=raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})}).then(keep).catch(e=>{persist(null);throw e}).finally(()=>refreshing=null);
 await refreshing;
}
async function api(path,options={}){await fresh();if(!session)throw new Error('Please sign in again.');return raw(path,options,true)}
async function callback(){
 const h=new URLSearchParams(location.hash.slice(1));
 if(h.has('error_description')){history.replaceState(null,'',location.pathname);throw new Error(h.get('error_description'))}
 if(!h.has('access_token'))return false;
 const recovery=h.get('type')==='recovery';
 history.replaceState(null,'',location.pathname);
 keep({access_token:h.get('access_token'),refresh_token:h.get('refresh_token'),expires_in:Number(h.get('expires_in')||3600)});
 try{await api('/auth/v1/user')}catch(e){persist(null);throw e}
 return recovery;
}
const apiObject={
 hasSession:()=>!!session,
 callback,
 async downloadDelivery(id){return api('/functions/v1/framework-bridge',{method:'POST',body:JSON.stringify({action:'download',id})})},
 async createOrder(order){return api('/rest/v1/office_orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(order)})},
 async order(id){return api('/rest/v1/office_orders?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1')},
 async orders(org){return api('/rest/v1/office_orders?select=*,office_payment_submissions(id,transaction_hash,created_at)&organization_id=eq.'+encodeURIComponent(org)+'&order=created_at.desc&limit=100')},
 async paymentSubmissions(order){return api('/rest/v1/office_payment_submissions?select=id,transaction_hash,created_at&order_id=eq.'+encodeURIComponent(order)+'&order=created_at.desc')},
 async submitPayment(order,hash){return api('/rest/v1/office_payment_submissions',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({order_id:order,transaction_hash:hash.toLowerCase()})})},
 async user(){return api('/auth/v1/user')},
 async login(email,password){keep(await raw('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})}));return api('/auth/v1/user')},
 async signup(email,password){const data=await raw('/auth/v1/signup?redirect_to='+encodeURIComponent(location.origin+'/workspace.html'),{method:'POST',body:JSON.stringify({email,password})});if(data?.access_token)keep(data);return data},
 async recover(email){return raw('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+'/workspace.html'),{method:'POST',body:JSON.stringify({email})})},
 async updatePassword(password){return api('/auth/v1/user',{method:'PUT',body:JSON.stringify({password})})},
 async logout(){try{if(session)await api('/auth/v1/logout',{method:'POST'})}finally{persist(null)}},
 async onboard(name){return api('/functions/v1/office-onboard',{method:'POST',body:JSON.stringify({name})})},
 async organizations(){return api('/rest/v1/office_organizations?select=id,name&order=created_at.asc')},
 async membership(org,user){return api('/rest/v1/office_memberships?select=role&organization_id=eq.'+encodeURIComponent(org)+'&user_id=eq.'+encodeURIComponent(user))},
 async records(table,org,order='created_at.desc',limit=200){const tables=['office_requests','office_projects','office_milestones','office_deliverables','office_updates'];if(!tables.includes(table))throw new Error('Unknown workspace resource');return api('/rest/v1/'+table+'?select=*&organization_id=eq.'+encodeURIComponent(org)+'&order='+encodeURIComponent(order)+'&limit='+limit)},
 async chatHistory(org,character){return api('/rest/v1/office_chat_turns?select=id,user_text,reply,state,suggestion,office_chat_files(id,name,mime,size)&organization_id=eq.'+encodeURIComponent(org)+'&character=eq.'+encodeURIComponent(character)+'&order=created_at.desc&limit=30')},
 async chat(org,character,text,id,files=[]){await fresh();if(!session)throw new Error('Please sign in again.');const r=await fetch('/api/office-chat',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({organization:org,character,text,id,files}),signal:AbortSignal.timeout(65000)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Chat could not complete. Please retry shortly.');return data},
 async chatFile(org,id,action,extra={}){await fresh();if(!session)throw new Error('Please sign in again.');const r=await fetch('/api/office-chat-file',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({organization:org,id,action,...extra}),signal:AbortSignal.timeout(20000)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Attachment could not complete.');return data},
 async uploadChatFile(org,file){const id=crypto.randomUUID();const mime=file.type||({pdf:'application/pdf',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[file.name.split('.').at(-1).toLowerCase()]);const data=await apiObject.chatFile(org,id,'init',{name:file.name,mime,size:file.size});const url=new URL(data.uploadUrl);if(url.origin!==config.url||!url.pathname.startsWith('/storage/v1/object/upload/sign/office-chat-files/'))throw new Error('Invalid upload destination');const r=await fetch(url.href,{method:'PUT',headers:{'Content-Type':mime,'x-upsert':'false'},body:file,signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error('File upload failed. Please remove it and try again.');return {id:data.id,name:data.name,mime:data.mime,size:data.size}},
 async downloadChatFile(org,id){const data=await apiObject.chatFile(org,id,'download');const url=new URL(data.url);if(url.origin!==config.url||!url.pathname.startsWith('/storage/v1/object/sign/office-chat-files/'))throw new Error('Invalid download destination');return url.href},
 async packageAccess(org){return api('/rest/v1/office_package_access?select=organization_id,ends_at&organization_id=eq.'+encodeURIComponent(org))},
 async saveRequest(organization,route,brief){if(!['managed','owned'].includes(route))throw new Error('Choose an office route.');const text=JSON.stringify(brief);if(new TextEncoder().encode(text).length>60000)throw new Error('Your brief is too long. Please shorten it.');return api('/rest/v1/office_requests',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({organization_id:organization,route,brief})})}
};
root.WorkspaceAPI=apiObject;
})(window);
