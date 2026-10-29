(function(){
'use strict';
const $=s=>document.querySelector(s),api=window.WorkspaceAPI,model=window.WorkspaceModel;
let user=null,organizations=[],organization=null,role=null,tab='overview',mode='login',recovery=false;
let importedTrial=null,checkoutOrder=null;
$('#order-services').onclick=()=>{checkoutOrder=null;tab='shop';render()};
window.addEventListener?.('message',event=>{const frame=document.getElementById('dashboard-checkout');if(!frame||event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='group-checkout-height')return;const height=event.data.height;if(Number.isFinite(height)&&height>=400&&height<=20000)frame.style.height=Math.ceil(height)+'px'});
let records={requests:[],projects:[],milestones:[],deliverables:[],updates:[]};
const assistantLink=new URLSearchParams(location.search||'').get('assistant');
if(window.OfficeAssistantModel?.team.some(p=>p.id===assistantLink)){tab='team';window.OfficeWorkspace.selectAssistant(assistantLink)}
function notice(message){
 const el=$('#notice');
 if(!$('#auth-panel').hidden)$('#auth-form').insertBefore(el,$('#auth-submit'));
 else $('#workspace-main').prepend(el);
 el.textContent=message||'';el.hidden=!message;
}
function show(panel){['auth-panel','reset-panel','setup-panel','dashboard','loading-panel'].forEach(id=>$('#'+id).hidden=id!==panel);$('#sign-out').hidden=!user}
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function date(value){if(!value)return 'Not set';const d=new Date(value.length===10?value+'T12:00:00':value);return Number.isNaN(d.getTime())?'Not set':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}
async function busy(form,work){
 const b=form.querySelector('button[type=submit]');if(b.disabled)return;
 b.disabled=true;form.setAttribute('aria-busy','true');
 const auth=form.id==='auth-form';
 if(auth){$('#login-tab').disabled=true;$('#signup-tab').disabled=true;b.textContent=mode==='signup'?'Creating account…':'Signing in…'}
 try{await work()}finally{
 b.disabled=false;form.removeAttribute('aria-busy');
 if(auth){$('#login-tab').disabled=false;$('#signup-tab').disabled=false;b.textContent=mode==='login'?'Sign in':'Create account'}
 }
}
function setMode(value){mode=value;$('#auth-heading').textContent=value==='login'?'Welcome back.':'Start your workspace.';$('#auth-submit').textContent=value==='login'?'Sign in':'Create account';$('#signup-note').hidden=value!=='signup';$('#login-tab').setAttribute('aria-pressed',value==='login');$('#signup-tab').setAttribute('aria-pressed',value==='signup');$('#auth-form').elements.password.autocomplete=value==='login'?'current-password':'new-password';notice('')}
$('#login-tab').onclick=()=>setMode('login');$('#signup-tab').onclick=()=>setMode('signup');
$('#auth-form').onsubmit=async e=>{e.preventDefault();await busy(e.target,async()=>{try{
 const email=e.target.elements.email.value.trim(),password=e.target.elements.password.value;notice('');
 if(mode==='signup'){await api.signup(email,password);e.target.elements.password.value='';if(!api.hasSession()){setMode('login');notice('Check your inbox and spam folder for the confirmation email. Confirm your email, then sign in below. Do not create the account again.');return}}
 else await api.login(email,password);
 e.target.elements.password.value='';await initialize();
 }catch(err){notice(err.message)}})};
$('#forgot-password').onclick=async()=>{const input=$('#auth-form').elements.email;if(!input.reportValidity())return;const button=$('#forgot-password');button.disabled=true;try{await api.recover(input.value.trim());notice('If this email has an account, a password-reset link will be sent. Check your inbox.')}catch(e){notice(e.message)}finally{button.disabled=false}};
$('#reset-form').onsubmit=async e=>{e.preventDefault();await busy(e.target,async()=>{try{await api.updatePassword(e.target.elements.password.value);e.target.reset();recovery=false;await api.logout();user=null;show('auth-panel');notice('Password updated. Sign in with your new password.')}catch(err){notice(err.message)}})};
$('#sign-out').onclick=async()=>{try{await api.logout()}catch{}finally{window.OfficeWorkspace?.reset();tab='overview';user=null;organizations=[];organization=null;records={requests:[],projects:[],milestones:[],deliverables:[],updates:[]};$('#workspace-content').replaceChildren();$('#request-dialog').close();show('auth-panel');notice('You are signed out.')}};
$('#setup-form').onsubmit=async e=>{e.preventDefault();await busy(e.target,async()=>{try{notice('');await api.onboard(e.target.elements.name.value.trim());await initialize()}catch(err){notice(err.message)}})};
$('#business-switch').onchange=async e=>{organization=organizations.find(o=>o.id===e.target.value);try{await load()}catch(err){notice(err.message)}};
$('#refresh').onclick=async()=>{const b=$('#refresh');b.disabled=true;try{await load();notice('Workspace refreshed.')}catch(e){notice(e.message)}finally{b.disabled=false}};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
function openRequest(){importedTrial=null;if(role==='viewer'){notice('This business gives your account read-only access.');return}const form=$('#request-form');form.reset();$('#request-error').textContent='';try{const draft=JSON.parse(sessionStorage.getItem('agenticcore.pendingBrief')||'null');if(draft&&typeof draft.text==='string'){form.elements.details.value=draft.text.slice(0,20000);if(draft.text.length>20000)$('#request-error').textContent='Your imported brief exceeds the request limit. Review and shorten it before saving; the original downloaded brief is unchanged.';form.elements.title.value=typeof draft.title==='string'?draft.title.slice(0,180):'My office starting brief';form.elements.route.value=draft.route==='owned'?'owned':'managed';if(draft.kind==='launch_trial_request'&&draft.trial?.version===1){const items=window.TrialModel.selection(draft.trial.serviceIds);importedTrial={version:1,days:7,serviceIds:items.map(s=>s.id)}}}}catch{}$('#request-dialog').showModal()}
$('#new-request').onclick=openRequest;$('#request-dialog .close').onclick=()=>$('#request-dialog').close();
$('#request-form').onsubmit=async e=>{e.preventDefault();await busy(e.target,async()=>{try{const f=e.target.elements;$('#request-error').textContent='';await api.saveRequest(organization.id,f.route.value,{title:f.title.value.trim(),text:f.details.value.trim(),version:1,...(importedTrial?{kind:'launch_trial_request',trial:importedTrial}:{})});importedTrial=null;sessionStorage.removeItem('agenticcore.pendingBrief');$('#request-dialog').close();tab='requests';await load();notice('Request saved for review. No payment or service has been activated.')}catch(err){$('#request-error').textContent=err.message}})};
async function initialize(){
 show('loading-panel');notice('');
 try{user=await api.user();if(!user.email_confirmed_at)throw new Error('Confirm your email before opening your workspace.');
 if(recovery){show('reset-panel');return}
 organizations=await api.organizations();
 if(!organizations.length){show('setup-panel');return}
 organization=organizations.find(o=>o.id===organization?.id)||organizations[0];
 const select=$('#business-switch');select.replaceChildren(...organizations.map(o=>{const option=node('option',o.name);option.value=o.id;return option}));select.value=organization.id;select.hidden=organizations.length<2;
 if(new URLSearchParams(location.search||'').get('next')==='checkout'){location.href='checkout.html';return}
 await load();show('dashboard');
 try{if(sessionStorage.getItem('agenticcore.pendingBrief'))notice('Your starting brief is ready. Choose New request to review it before submitting. Trial requests need acceptance and a confirmed start date.')}catch{}
 }catch(e){user=null;show('auth-panel');notice(e.message)}
}
async function load(){
 $('#workspace-content').replaceChildren(node('p','Loading business records…','empty-state'));
 const result=await Promise.all([api.membership(organization.id,user.id),api.records('office_requests',organization.id),api.records('office_projects',organization.id),api.records('office_milestones',organization.id,'position.asc',500),api.records('office_deliverables',organization.id),api.records('office_updates',organization.id),api.packageAccess(organization.id).catch(()=>[])]);
 role=result[0][0]?.role;records={requests:result[1],projects:result[2],milestones:result[3],deliverables:result[4],updates:result[5],packageAccess:result[6]};
 $('#business-title').textContent=organization.name;$('#account-label').textContent=user.email+' · '+(role||'Member');$('#new-request').hidden=role==='viewer';$('#order-services').hidden=role==='viewer';render();
}
function empty(text){return node('p',text,'empty-state')}
function card(title){const el=node('article',undefined,'workspace-card');el.append(node('h2',title));return el}
function recordTop(title,status){const el=node('div',undefined,'record-top');el.append(node('h3',title),node('span',model.status(status),'status-pill'));return el}
function renderRequests(target){
 const list=node('div',undefined,'record-list');if(!records.requests.length)list.append(empty('No requests yet. Save your first office brief or describe a new task.'));
 records.requests.forEach(r=>{const c=node('article',undefined,'workspace-card');c.append(recordTop(r.brief?.title||'Office request',r.status),node('p',(r.brief?.kind==='launch_trial_request'?'Seven-day trial request':r.route==='owned'?'Company-owned office':'Managed office')+' · '+date(r.created_at),'record-date'));const d=node('details');d.append(node('summary','View submitted brief'),node('pre',r.brief?.text||JSON.stringify(r.brief,null,2),'record-body'));c.append(d);list.append(c)});target.append(list);
}
function renderProjects(target){
 const list=node('div',undefined,'record-list');if(!records.projects.length)list.append(empty('No accepted projects yet. A submitted request appears here only after a project is scoped and created by the team.'));
 records.projects.forEach(p=>{const c=node('article',undefined,'workspace-card');c.append(recordTop(p.title,p.status),node('p',p.department+' · Target date: '+date(p.due_on),'record-date'),node('p',p.description));const milestones=records.milestones.filter(m=>m.project_id===p.id);if(milestones.length){const d=node('details');d.append(node('summary','Milestones ('+milestones.length+')'));milestones.forEach(m=>{const row=node('div',undefined,'milestone');row.append(node('span',m.title+' · '+date(m.due_on)),node('span',model.status(m.status),'status-pill'));d.append(row)});c.append(d)}else c.append(node('p','Milestones will appear when the work plan is confirmed.','fine'));list.append(c)});target.append(list);
}
function renderDeliverables(target){
 const list=node('div',undefined,'record-list');if(!records.deliverables.length)list.append(empty('No deliverables have been shared yet. Approved file and delivery links will appear here.'));
 records.deliverables.forEach(d=>{const c=card(d.label);const project=records.projects.find(p=>p.id===d.project_id);c.append(node('p',(project?.title||'Project')+' · '+date(d.created_at),'record-date'));if(d.notes)c.append(node('p',d.notes));const url=model.safeUrl(d.url);if(url){const a=node('a','Open deliverable ↗','delivery-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';c.append(a)}else c.append(node('p','This delivery link is unavailable. Please request an updated link.'));list.append(c)});target.append(list);
}
function renderCheckout(target){
 const intro=card('Order services');intro.append(node('p','Choose departments or a framework, review the price and save your order. Your signed-in business is carried into checkout. A custom request is for work that needs a separate brief.'));target.append(intro);
 const frame=node('iframe',undefined,'dashboard-checkout');frame.id='dashboard-checkout';frame.title='Select services, create an order and submit payment';frame.src='checkout.html?embed=1&business='+encodeURIComponent(organization.id)+(checkoutOrder?'&order='+encodeURIComponent(checkoutOrder):'');frame.style.height='1800px';target.append(frame);
}
async function renderOrders(target){
 const orgId=organization.id;const heading=card('My orders');heading.append(node('p','Orders for '+organization.name+'. Submitted transaction hashes remain pending until the team verifies receipt.'));const start=node('button','Order a service +','dark');start.type='button';start.onclick=()=>{checkoutOrder=null;tab='shop';render()};heading.append(start);target.append(heading);const list=node('div',undefined,'record-list');list.append(empty('Loading your orders…'));target.append(list);
 try{const rows=await api.orders(orgId);if(organization.id!==orgId||tab!=='orders')return;list.replaceChildren();if(!rows.length)list.append(empty('No service orders yet. Choose Order a service to select your package and checkout. Custom requests appear in their own section.'));
 rows.forEach(o=>{const c=card(o.configuration.route==='owned'?'Framework order':'Managed office order');const status=o.status==='awaiting_payment'&&o.office_payment_submissions?.length?'Payment verification pending':o.status.replaceAll('_',' ');c.append(node('p',status,'status-pill'),node('p','Order '+o.id,'record-body'),node('p',date(o.created_at)+' · '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(o.total_cents/100)+' total · '+(o.payment_method==='ac'?'AC Token':'USDT')),node('p',o.schedule==='installments'?'Four-payment schedule':'Full payment'));const view=node('button','View order & payment','outline');view.type='button';view.onclick=()=>{checkoutOrder=o.id;tab='shop';render()};c.append(view);list.append(c)});
 }catch(e){if(organization.id===orgId&&tab==='orders'){list.replaceChildren(empty('Orders could not load: '+e.message));}}
}
function render(){
 const content=$('#workspace-content');content.replaceChildren();
 document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 if(tab==='shop')return renderCheckout(content);if(tab==='orders')return renderOrders(content);
 if(tab==='requests')return renderRequests(content);if(tab==='projects')return renderProjects(content);if(tab==='deliverables')return renderDeliverables(content);
 if(tab==='office'||tab==='team'){
  const orgId=organization.id;
  const context={organization,role,records,notice,history(character){return api.chatHistory(orgId,character)},upload(file){if(organization.id!==orgId)return Promise.reject(new Error('Your business changed.'));return api.uploadChatFile(orgId,file)},download(id){if(organization.id!==orgId)return Promise.reject(new Error('Your business changed.'));return api.downloadChatFile(orgId,id)},chat(character,text,id,files){if(organization.id!==orgId)return Promise.reject(new Error('Your business changed. Open the conversation again.'));return api.chat(orgId,character,text,id,files)},navigate(value){tab=value;render()},
   save(route,brief){if(organization.id!==orgId)return Promise.reject(new Error('Your business changed. Review the proposal again.'));return api.saveRequest(orgId,route,brief)},
   async saved(){if(organization.id!==orgId)return;await load();notice('Office proposal saved for scope review. No payment or service has been activated.')}};
  return window.OfficeWorkspace[tab==='office'?'renderOffice':'renderChat'](content,context);
 }

 const sums=model.summary(records.requests,records.projects);const stats=node('div',undefined,'stat-grid');[['Open requests',sums.requests],['Active projects',sums.active],['Awaiting approval',sums.approvals]].forEach(([label,n])=>{const stat=node('article',undefined,'workspace-stat');stat.append(node('span',label),node('strong',String(n)));stats.append(stat)});content.append(stats);
 const grid=node('div',undefined,'workspace-grid');const next=card('Your next step');next.append(node('p',records.requests.length?'Use Requests to review your submitted briefs, and Projects for accepted work and milestones.':'Describe the first result you need. We will confirm scope before any work starts.'));const button=node('button','View requests ↗','link');button.onclick=()=>{tab='requests';render()};next.append(button);
 const updates=card('Office updates');if(!records.updates.length)updates.append(empty('No office updates yet. Confirmed progress and requests for information will appear here.'));records.updates.slice(0,10).forEach(u=>{updates.append(node('h3',u.title),node('p',u.body),node('p',date(u.created_at),'record-date'))});grid.append(next,updates);const orderCard=card('Choose a service and place an order');orderCard.append(node('p','Select departments or a framework, review the total and payment schedule, then create your order. Use My orders to return to payment and track verification.'));const orderAction=node('button','Order services →','dark');orderAction.type='button';orderAction.onclick=()=>{checkoutOrder=null;tab='shop';render()};const historyAction=node('button','My orders ↗','outline');historyAction.type='button';historyAction.onclick=()=>{tab='orders';render()};orderCard.append(orderAction,historyAction);content.append(orderCard);const welcome=card('Shape your office with your team');welcome.append(node('p','Choose departments and work allowances in My office, or let Amara guide your setup. Maya is your everyday coordinator.'));const configure=node('button','Design my office ↗','dark');configure.type='button';configure.onclick=()=>{tab='office';render()};const chat=node('button','Talk to Maya ↗','outline');chat.type='button';chat.onclick=()=>{window.OfficeWorkspace.selectAssistant('maya');tab='team';render()};welcome.append(configure,chat);content.append(welcome);content.append(grid,node('p','Showing up to the latest 200 records per section. Refresh to retrieve current status.','fine'));
}
(async()=>{try{recovery=await api.callback();if(api.hasSession())await initialize();else show('auth-panel')}catch(e){show('auth-panel');notice(e.message)}})();
})();
