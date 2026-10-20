(function(root){
'use strict';
const model=root.OfficeModel,builds=root.OwnedOfficePackages;
const money=n=>'$'+n.toLocaleString('en-US',{maximumFractionDigits:2});
function answer(text){
 const t=String(text).trim();
 if(/\b(trial|free|try)\b/i.test(t))return {text:'Our seven-day launch trial lets you choose up to two small deliverables from different departments: a short product or service launch brief, three social captions, one short video script, a one-page document, five FAQ replies, a blank expense tracker, or a three-point website review. No card or automatic paid renewal. One trial per business, subject to scope and capacity review. The week starts on the date confirmed by the team; this is not a paid package or Forge access.',target:'launch-trial'};
 if(/\b(forge)\b/i.test(t))return {text:'Forge introduces the Agenticcore vision. Direct conversation with Forge is reserved for clients with an active office package. I can help you explore the options now.',target:'office-options-route'};
 if(/\b(status|submitted|proposal|request|progress|my account)\b/i.test(t))return {text:'Your proposals and recorded progress are private. Sign in to your workspace to review them with Maya. A submitted proposal awaits scope review and does not activate a service.',workspace:true};
 if(/\b(managed|compare|difference|routes?)\b/i.test(t))return {text:'Managed office: choose departments and a recurring work allowance; Agenticcore coordinates delivery and the standard tools within scope.\n\nCompany-owned office: commission a framework connected to your systems, with an agreed handover. You pay a scoped build plus ongoing usage costs.\n\nChoose managed support for recurring work, or an owned build for your company’s own framework.',target:'office-options-route'};
 if(/\b(own|owned|build|framework|new website|new site)\b/i.test(t))return {text:'For a company-owned office, these are the proposed starting builds:\n'+builds.map(p=>p.name+' — '+money(p.price)+'. '+p.scope).join('\n\n')+'\n\nThe build uses four 25% milestone payments. API usage, hosting and required third-party costs continue separately; maintenance is optional. Final scope and price need confirmation.',route:'owned',target:'own-office'};
 if(/\b(price|prices|cost|budget|payment|weekly|packages?)\b/i.test(t))return {text:'Managed support is priced per 28-day cycle. At Essential level:\n'+model.departments.map(d=>d.name+' — '+money(d.price)).join('\n')+'\n\nChoose only what you need. Growth doubles the allowance and price; Extended triples them. Four weekly payments divide the cycle price and do not reset the allowance. Advertising spend is separate. These are proposed estimates until scope is confirmed.',route:'managed',target:'plans'};

 if(/\b(services?|departments?|offer)\b/i.test(t))return {text:'You can choose from seven departments:\n'+model.departments.map(d=>d.name+' — '+d.examples[0]).join('\n\n')+'\n\nWhich part of your business needs help first? Tell me the task and I can point you to a starting option.',target:'departments'};

 const rules={admin:/\b(admin|documents?|pdf|letters?|reminders?)\b/i,creative:/\b(design|creative|images?|flyers?|videos?|scripts?|logos?|branding)\b/i,marketing:/\b(marketing|social|posts?|instagram|facebook|campaigns?)\b/i,customer:/\b(customers?|enquiries|inquiries|reception|support desk)\b/i,finance:/\b(bookkeep\w*|finance|invoices?|expenses?|sales records)\b/i,research:/\b(research|meetings?|competitors?|feasibility)\b/i,technology:/\b(websites?|automation|integrations?|maintenance|technical)\b/i};
 const selected=model.departments.filter(d=>rules[d.id].test(t));
 if(selected.length){const result=model.calculate(selected.map(d=>d.id),'essential');return {text:selected.map(d=>d.name+' · '+d.lead+'\n'+d.output+'\nEssential allowance: '+d.unit+' '+d.measure+' per 28-day cycle.\n'+d.outside).join('\n\n')+'\n\nProposed Essential total: '+money(result.total)+' per 28-day cycle, or four payments of '+money(result.weekly)+'. Review the builder to adjust departments and work level. Delivery dates and scope are confirmed before acceptance.',route:'managed',target:'plans'}}
 if(/\b(account|sign.?up|register|start|join)\b/i.test(t))return {text:'You can explore the services here first. When ready, open the workspace, choose Create account, verify your email and sign in. You can then discuss your needs with Maya and save an office proposal for scope review. Creating an account does not buy or activate a package.',workspace:true};
 if(/\b(hi|hello|hey)\b/i.test(t))return {text:'Hello, I’m Maya, your website guide. What would you like help with: services, prices, or choosing between a managed office and a company-owned build?'};
 return {text:'I can guide you through the website’s services, proposed prices and office routes using prepared catalogue answers. Tell me the kind of help you need—such as marketing, design, admin or automation—or choose a topic below. For a detailed AI conversation about your business, continue with Maya in the workspace.',target:'departments'};
}
root.VisitorGuide={answer};
if(typeof module!=='undefined'&&module.exports)module.exports={answer};
if(typeof document==='undefined')return;
const dialog=document.querySelector('#visitor-guide'),log=document.querySelector('#visitor-log'),form=document.querySelector('#visitor-form'),input=document.querySelector('#visitor-message');
let brief=[],route='managed';
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e};
function bubble(text,kind){const article=node('article',null,'visitor-message '+kind);article.append(node('strong',kind==='client'?'You':'Maya'),node('p',text));log.append(article);return article}
function submit(text){const value=String(text).trim().slice(0,1000);if(!value)return;brief.push(value);brief=brief.slice(-8);bubble(value,'client');const reply=answer(value);if(reply.route)route=reply.route;const article=bubble(reply.text,'assistant');if(reply.target){const link=node('a','Explore this option ↗');link.href=(reply.target==='launch-trial'?'./':'services.html')+'#'+reply.target;link.onclick=()=>dialog.close();article.append(link)}if(reply.workspace){const link=node('a','Open my workspace ↗');link.href='workspace.html?assistant=maya';article.append(link)}log.scrollTop=log.scrollHeight}
function open(){if(!dialog.open)dialog.showModal()}
document.querySelectorAll('[data-visitor-guide]').forEach(button=>button.onclick=open);
if(root.IntersectionObserver){const hero=document.querySelector('.visitor-hero-button'),launcher=document.querySelector('.visitor-launcher');if(hero&&launcher)new root.IntersectionObserver(entries=>{launcher.hidden=entries[0].isIntersecting},{threshold:0}).observe(hero)}
document.querySelector('#visitor-close').onclick=()=>dialog.close();
document.querySelectorAll('[data-visitor-topic]').forEach(button=>button.onclick=()=>submit(button.dataset.visitorTopic));
form.onsubmit=e=>{e.preventDefault();submit(input.value);input.value='';input.focus()};
document.querySelector('#visitor-continue').onclick=()=>{try{if(brief.length)sessionStorage.setItem('agenticcore.pendingBrief',JSON.stringify({route,text:'VISITOR STARTING BRIEF\n\n'+brief.join('\n\n')+'\n\nPrepared in the website guide. Review and save in the workspace; no service or payment is authorized.'}));root.location.href='workspace.html?assistant=maya'}catch{document.querySelector('#visitor-notice').textContent='Your browser cannot carry this brief. Copy your messages, then use the workspace link.'}};
bubble('Welcome! I’m Maya. I can explain our services, proposed prices and the two office routes before you create an account. What would you like help with?','assistant');
})(typeof window==='undefined'?globalThis:window);
