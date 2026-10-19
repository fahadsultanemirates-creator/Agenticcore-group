(function(root){
'use strict';
const model=root.OfficeModel,guide=root.OfficeAssistantModel,packages=root.OwnedOfficePackages;
let business=null,draft=null,character='maya',messages=[],context,conversationBrief='',requestedAssistant=null;
function initial(){return {route:'managed',departments:[],level:'essential',packageId:'starter',officeName:'',characterName:'',characterStyle:'To be chosen',goals:''}}
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function button(text,work,cls='outline'){const b=node('button',text,cls);b.type='button';b.onclick=work;return b}
function title(target,kicker,heading,description){target.append(node('p',kicker,'eyebrow'),node('h2',heading,'office-section-title'),node('p',description,'office-description'))}
function bind(ctx){context=ctx;if(business!==ctx.organization.id){business=ctx.organization.id;draft=initial();draft.officeName=ctx.organization.name;messages=[];conversationBrief='';character='maya'}if(requestedAssistant){character=requestedAssistant;requestedAssistant=null}}
function openChat(id){if(guide.team.some(p=>p.id===id)){character=id;messages=[]}context.navigate('team')}
function labelInput(form,text,name,value,max=120){const label=node('label',text);const input=node('input');input.name=name;input.value=value;input.maxLength=max;input.oninput=()=>draft[name]=input.value;label.append(input);form.append(label);return input}
function renderOffice(target,ctx){
 bind(ctx);
 title(target,'AMARA / DESIGN YOUR OFFICE','Build an office around your work.','Select the support you need, review the allowance and save a proposal to your business. Maya stays your everyday contact.');
 const intro=node('div',undefined,'office-toolbar');intro.append(button('Ask Amara to help ↗',()=>openChat('amara')),button('Talk to Maya ↗',()=>openChat('maya')));target.append(intro);
 const previous=(ctx.records.requests||[]).filter(r=>r.brief?.kind==='office_configuration');
 if(previous.length){const saved=node('details',undefined,'saved-offices');saved.append(node('summary','Saved office proposals ('+previous.length+')'));
  previous.forEach(r=>{const row=node('article',undefined,'saved-office');row.append(node('h3',r.brief.title||'Office proposal'),node('p',root.WorkspaceModel.status(r.status)+' · '+new Date(r.created_at).toLocaleDateString()),node('p','Request for review. Saving does not activate a package. Reviewing these choices recalculates current proposal prices; the submitted snapshot stays in Requests.'));
   row.append(button('Review these choices',()=>{try{const c=r.brief.configuration;guide.snapshot(c,model,packages);draft={...initial(),...c,departments:[...(c.departments||[])]};target.replaceChildren();renderOffice(target,ctx)}catch{ctx.notice('This saved proposal cannot be loaded. Its original brief remains in Requests.')}}));saved.append(row)});target.append(saved)
 }
 let saving=false;const form=node('form',undefined,'dashboard-office-form');const grid=node('div',undefined,'dashboard-office-grid');const choices=node('div',undefined,'office-choice-panel');const summary=node('aside',undefined,'office-preview');summary.setAttribute('aria-label','Office proposal summary');
 const routeLabel=node('label','1. Choose your office route');const route=node('select');route.name='route';[['managed','Run my office — managed support'],['owned','Build my own office — company-owned framework']].forEach(([v,t])=>{const o=node('option',t);o.value=v;route.append(o)});route.value=draft.route;routeLabel.append(route);choices.append(routeLabel);
 labelInput(choices,'Office name','officeName',draft.officeName);
 const managed=node('div');const owned=node('div');
 const field=node('fieldset');field.append(node('legend','2. Choose departments and services'));
 model.departments.forEach(d=>{
  const option=node('div',undefined,'dashboard-department');const label=node('label');const input=node('input');input.type='checkbox';input.value=d.id;input.checked=draft.departments.includes(d.id);const copy=node('span');copy.append(node('strong',d.name),node('small',d.lead+' · '+guide.money(d.price)+' at Essential level'));label.append(input,copy);option.append(label);
  const details=node('details');details.append(node('summary','Deliverables, inputs and revisions'));details.append(node('p','You receive: '+d.output),node('p','One unit: '+d.oneRequest),node('p','Inputs: '+d.inputs),node('p','Revisions: '+d.revision),node('p','Outside scope: '+d.outside));option.append(details);field.append(option);
  input.onchange=()=>{draft.departments=input.checked?[...new Set([...draft.departments,d.id])]:draft.departments.filter(id=>id!==d.id);update()}
 });managed.append(field);
 const levelLabel=node('label','3. Choose work level');const level=node('select');level.name='level';model.levels.forEach(l=>{const o=node('option',l.name+' — '+l.description);o.value=l.id;level.append(o)});level.value=draft.level;level.onchange=()=>{draft.level=level.value;update()};levelLabel.append(level);managed.append(levelLabel);
 const packLabel=node('label','2. Choose a starting build');const pack=node('select');pack.name='packageId';packages.forEach(p=>{const o=node('option',p.name+' — '+guide.money(p.price));o.value=p.id;pack.append(o)});pack.value=draft.packageId;pack.onchange=()=>{draft.packageId=pack.value;update()};packLabel.append(pack);owned.append(packLabel);
 labelInput(owned,'Preferred lead-character name (optional)','characterName',draft.characterName,80);
 const styleLabel=node('label','Character style');const style=node('select');['To be chosen','3D illustrated','Professional portrait','Simple illustrated'].forEach(v=>{const o=node('option',v);style.append(o)});style.value=draft.characterStyle;style.onchange=()=>draft.characterStyle=style.value;styleLabel.append(style);owned.append(styleLabel);
 choices.append(managed,owned);
 const goalsLabel=node('label','4. What should your office do first?');const goals=node('textarea');goals.name='goals';goals.rows=5;goals.maxLength=4000;goals.value=draft.goals;goals.placeholder='Describe the first tasks, preferred deadline and available materials. Leave out passwords and private customer details.';goals.oninput=()=>draft.goals=goals.value;goalsLabel.append(goals);choices.append(goalsLabel);
 const feedback=node('p',undefined,'office-save-feedback');feedback.setAttribute('role','status');feedback.setAttribute('tabindex','-1');
 const consentLabel=node('label',undefined,'consent');const consent=node('input');consent.type='checkbox';consent.required=true;consentLabel.append(consent,node('span','Save this proposed office and its requirements to my business for scope review. This does not authorize payment, publishing or service activation.'));
 const save=node('button','Save office proposal','dark');save.type='submit';
 const review=node('p','Read-only members can explore the builder but cannot save proposals.','fine');review.hidden=ctx.role!=='viewer';
 function update(){managed.hidden=draft.route!=='managed';owned.hidden=draft.route!=='owned';summary.replaceChildren();summary.append(node('p','YOUR PROPOSED OFFICE','eyebrow'));
  try{const s=guide.snapshot(draft,model,packages);summary.append(node('h3',s.route==='managed'?'Managed office':s.packageName),node('p',guide.money(s.total),'office-estimate'),node('p',s.route==='managed'?'Per 28-day service cycle':'One-time starting build'),node('p','4 × '+guide.money(s.installment)+' — '+(s.route==='managed'?'weekly payments':'project milestones')));
   if(s.route==='managed'){s.departments.forEach((id,i)=>{const d=model.departments.find(d=>d.id===id);summary.append(node('h4',d.name),node('p',s.allowances[i]))});summary.append(node('p','Managed delivery tools and coordination included within agreed scope. Paid advertising spend is separate. Weekly payments divide the cycle price; they do not reset allowances.','fine'))}
   else summary.append(node('p',s.scope),node('p',s.delivery),node('p','Ongoing API, hosting and required third-party costs are paid separately. Maintenance is optional. Scope, handover and support terms are confirmed before work.','fine'));
   save.disabled=saving||ctx.role==='viewer'
  }catch(e){summary.append(node('p',e.message));save.disabled=true}
  summary.append(node('p','Proposed estimate · awaiting scope confirmation. No payment is collected here.','fine'));
 }
 route.onchange=()=>{draft.route=route.value;update()};
 grid.append(choices,summary);form.append(grid,consentLabel,review,feedback,save);target.append(form);update();
 form.onsubmit=async event=>{event.preventDefault();if(save.disabled||saving)return;saving=true;save.disabled=true;const originalBusiness=business;route.disabled=true;save.textContent='Saving proposal…';
  try{if(ctx.role==='viewer')throw Error('Your access is read-only.');const configuration=guide.snapshot(draft,model,packages);await ctx.save(configuration.route,{kind:'office_configuration',version:2,title:(configuration.officeName||ctx.organization.name)+' — '+(configuration.route==='managed'?'managed office':'office build'),text:guide.describe(configuration,model),configuration});if(business!==originalBusiness)return;feedback.textContent='Office proposal saved. Awaiting scope confirmation; no service has been activated.';consent.checked=false;feedback.focus();await ctx.saved()}
  catch(e){feedback.textContent=e.message;feedback.focus()}
  finally{saving=false;route.disabled=false;save.textContent='Save office proposal';update()}
 };
}
function renderChat(target,ctx){
 bind(ctx);
 const forgeAllowed=(ctx.records.packageAccess||[]).some(row=>row.organization_id===ctx.organization.id&&Date.parse(row.ends_at)>Date.now());
 if(character==='forge'&&!forgeAllowed){character='maya';messages=[];conversationBrief=''}
 title(target,'YOUR TEAM / ONE PLACE TO TALK','Talk through your next step.','Maya coordinates your office. Amara helps with setup; specialists explain their departments.');
 const layout=node('div',undefined,'office-chat-layout');const roster=node('nav',undefined,'office-team-roster');roster.setAttribute('aria-label','Choose an office assistant');
 guide.team.forEach((p,i)=>{const locked=p.id==='forge'&&!forgeAllowed;const b=button('',()=>{if(locked)return;character=p.id;messages=[];conversationBrief='';target.replaceChildren();renderChat(target,ctx)},'team-contact');b.disabled=locked;b.setAttribute('aria-pressed',p.id===character?'true':'false');b.setAttribute('aria-label',locked?'Forge — available with an active package':p.name+' — '+p.role);const portrait=node('span',undefined,'team-avatar');portrait.style.setProperty('--x',(i%5)*25+'%');portrait.style.setProperty('--y',i<5?'23%':'91%');portrait.setAttribute('aria-hidden','true');const copy=node('span');copy.append(node('strong',p.name),node('small',locked?'Active package required':p.role));b.append(portrait,copy);roster.append(b)});
 const panel=node('section',undefined,'office-chat-panel');const person=guide.team.find(p=>p.id===character)||guide.team[1];panel.append(node('h3',person.name+' / '+person.role),node('p','Guided assistant · live AI conversation is not connected. Messages stay in this page until you change assistant, business or sign out. Only a proposal you explicitly save goes to your business records.','fine'));
 const log=node('div',undefined,'office-chat-log');log.setAttribute('role','log');log.setAttribute('aria-label','Conversation with '+person.name);log.setAttribute('aria-live','polite');
 function bubble(name,text,kind){const m=node('article',undefined,'chat-message '+kind);m.append(node('strong',name),node('p',text));log.append(m)}
 bubble(person.name,person.intro,'assistant');messages.forEach(m=>bubble(m.who==='client'?'You':person.name,m.text,m.who));
 const actions=node('div',undefined,'office-chat-actions');actions.append(button('Create or edit my office ↗',()=>context.navigate('office'),'dark'),button('View requests',()=>context.navigate('requests')),button('View projects',()=>context.navigate('projects')));
 if(person.departments.length)actions.append(button('Explore '+person.name+'’s departments',()=>{const recommended=person.departments;showSuggestion(recommended)},'outline'));
 const suggestion=node('div',undefined,'chat-suggestion');suggestion.hidden=true;
 function showSuggestion(ids){suggestion.replaceChildren(node('p','Suggested departments: '+ids.map(id=>model.departments.find(d=>d.id===id).name).join(', ')),button('Use these departments in my builder',()=>{draft.route='managed';draft.departments=[...ids];context.navigate('office')}));suggestion.hidden=false}
 const form=node('form',undefined,'office-chat-compose');const label=node('label','Your message');const input=node('textarea');input.rows=3;input.maxLength=2000;input.required=true;input.placeholder='For example: I need social posts and bookkeeping support.';label.append(input);const send=node('button','Send to guided assistant','dark');send.type='submit';form.append(label,send);
 const useBrief=button('Use my messages as an office brief',()=>{draft.goals=conversationBrief.slice(0,4000);context.navigate('office')});useBrief.disabled=!conversationBrief;
 const remaining=node('p','This guide explains and prepares briefs. It does not deliver work or contact people.','fine');
 form.onsubmit=e=>{e.preventDefault();if(person.id==='forge'&&!(ctx.records.packageAccess||[]).some(row=>row.organization_id===ctx.organization.id&&Date.parse(row.ends_at)>Date.now())){target.replaceChildren();renderChat(target,ctx);return}const text=input.value.trim();if(!text)return;
  if(messages.length>=40){remaining.textContent='This conversation has reached its planning limit. Use your messages as a brief, or choose another assistant to start again.';return}
  const answer=guide.reply(text,person,ctx.records,model);messages.push({who:'client',text},{who:'assistant',text:answer.text});bubble('You',text,'client');bubble(person.name,answer.text,'assistant');conversationBrief=(conversationBrief?conversationBrief+'\n':'')+text;if(conversationBrief.length>4000)conversationBrief=conversationBrief.slice(0,4000);useBrief.disabled=false;input.value='';suggestion.hidden=true;if(answer.ids.length)showSuggestion(answer.ids);log.scrollTop=log.scrollHeight;
 };
 panel.append(log,actions,suggestion,form,useBrief,remaining);layout.append(roster,panel);target.append(layout);
}
root.OfficeWorkspace={renderOffice,renderChat,reset(){business=null;draft=null;messages=[];conversationBrief='';character='maya';requestedAssistant=null},selectAssistant(id){if(guide.team.some(p=>p.id===id)){character=id;requestedAssistant=id;messages=[];conversationBrief=''}}};
})(window);
