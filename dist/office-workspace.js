(function(root){
'use strict';
const model=root.OfficeModel,guide=root.OfficeAssistantModel,packages=root.OwnedOfficePackages;
let business=null,draft=null,character='maya',messages=[],context,conversationBrief='',requestedAssistant=null,viewVersion=0,cleanupChat=()=>{};
function initial(){return {route:'managed',departments:[],level:'essential',packageId:'starter',officeName:'',characterName:'',characterStyle:'To be chosen',goals:''}}
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function button(text,work,cls='outline'){const b=node('button',text,cls);b.type='button';b.onclick=work;return b}
function title(target,kicker,heading,description){target.append(node('p',kicker,'eyebrow'),node('h2',heading,'office-section-title'),node('p',description,'office-description'))}
function bind(ctx){context=ctx;if(business!==ctx.organization.id){business=ctx.organization.id;draft=initial();draft.officeName=ctx.organization.name;messages=[];conversationBrief='';character='maya'}if(requestedAssistant){character=requestedAssistant;requestedAssistant=null}}
function openChat(id){if(guide.team.some(p=>p.id===id)){character=id;messages=[]}context.navigate('team')}
function labelInput(form,text,name,value,max=120){const label=node('label',text);const input=node('input');input.name=name;input.value=value;input.maxLength=max;input.oninput=()=>draft[name]=input.value;label.append(input);form.append(label);return input}
function renderOffice(target,ctx){
 cleanupChat();++viewVersion;bind(ctx);
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
 cleanupChat();const view=++viewVersion;bind(ctx);
 const forgeAllowed=(ctx.records.packageAccess||[]).some(row=>row.organization_id===ctx.organization.id&&Date.parse(row.ends_at)>Date.now());
 if(character==='forge'&&!forgeAllowed){character='maya';messages=[];conversationBrief=''}
 const dialog=node('dialog',undefined,'office-chat-window');dialog.setAttribute('aria-label','Office character conversation');dialog.oncancel=e=>{e.preventDefault();ctx.navigate('overview')};
 const layout=node('div',undefined,'office-chat-layout');const roster=node('nav',undefined,'office-team-roster');roster.setAttribute('aria-label','Choose an office assistant');
 guide.team.forEach((p,i)=>{const locked=p.id==='forge'&&!forgeAllowed;const b=button('',()=>{if(locked)return;character=p.id;messages=[];conversationBrief='';target.replaceChildren();renderChat(target,ctx)},'team-contact');b.disabled=locked;b.setAttribute('aria-pressed',p.id===character?'true':'false');b.setAttribute('aria-label',locked?'Forge — available with an active package':p.name+' — '+p.role);const portrait=node('span',undefined,'team-avatar');portrait.style.setProperty('--x',(i%5)*25+'%');portrait.style.setProperty('--y',i<5?'23%':'91%');portrait.setAttribute('aria-hidden','true');const copy=node('span');copy.append(node('strong',p.name),node('small',locked?'Active package required':p.role));b.append(portrait,copy);roster.append(b)});
 const panel=node('section',undefined,'office-chat-panel');const person=guide.team.find(p=>p.id===character)||guide.team[1];
 const header=node('header',undefined,'character-chat-header');const identity=node('div',undefined,'character-chat-identity');const avatar=node('span',undefined,'team-avatar selected-character-avatar');const index=guide.team.findIndex(p=>p.id===person.id);avatar.style.setProperty('--x',(index%5)*25+'%');avatar.style.setProperty('--y',index<5?'23%':'91%');avatar.setAttribute('role','img');avatar.setAttribute('aria-label',person.name+' portrait');const heading=node('div');heading.append(node('h3',person.name+' / '+person.role),node('p','Your AI office assistant','fine'));identity.append(avatar,heading);header.append(identity,button('Back to dashboard',()=>ctx.navigate('overview')));
 const switchLabel=node('label','Change character');const switcher=node('select');switcher.setAttribute('aria-label','Change character');guide.team.forEach(p=>{const option=node('option',p.name+(p.id==='forge'&&!forgeAllowed?' — package required':''));option.value=p.id;option.disabled=p.id==='forge'&&!forgeAllowed;switcher.append(option)});switcher.value=person.id;switcher.onchange=()=>{if(switcher.value==='forge'&&!forgeAllowed)return;character=switcher.value;messages=[];conversationBrief='';target.replaceChildren();renderChat(target,ctx)};switchLabel.append(switcher);switchLabel.className='mobile-character-switch';header.append(switchLabel);
 const privacy=node('details',undefined,'chat-privacy');privacy.append(node('summary','About this AI conversation'),node('p','Messages and relevant business context are sent to OpenAI for replies and saved privately to your account within this business. Office suggestions need review before submission. This chat cannot activate services or perform external actions.','fine'));

 const log=node('div',undefined,'office-chat-log');log.setAttribute('role','log');log.setAttribute('aria-label','Conversation with '+person.name);log.setAttribute('aria-live','polite');
 function bubble(name,text,kind){const m=node('article',undefined,'chat-message '+kind);m.append(node('strong',name),node('p',text));log.append(m);return m}
 bubble(person.name,person.intro,'assistant');
 const actions=node('div',undefined,'office-chat-actions');actions.append(button('Create or edit my office ↗',()=>context.navigate('office'),'dark'),button('View requests',()=>context.navigate('requests')),button('View projects',()=>context.navigate('projects')));
 if(person.departments.length)actions.append(button('Explore '+person.name+'’s departments',()=>{const recommended=person.departments;showSuggestion(recommended)},'outline'));
 function suggestionCard(description,apply,parent){const card=node('details',undefined,'chat-suggestion');card.append(node('summary','Suggested office — optional'),node('p',description),button('Review this office suggestion',apply));(parent||log).append(card);return card}
 function showSuggestion(ids){const m=bubble(person.name,'You can explore these departments in your office builder.','assistant');suggestionCard(ids.map(id=>model.departments.find(d=>d.id===id).name).join(', '),()=>{draft.route='managed';draft.departments=[...ids];context.navigate('office')},m);log.scrollTop=m.offsetTop-log.offsetTop}
 function showOfficeSuggestion(s,parent){if(!s||s.route==='none')return;const chosen=(s.departments||[]).filter(id=>model.departments.some(d=>d.id===id));suggestionCard(s.route==='owned'?'A company-owned office build. Review its scope and milestone estimate.':'Suggested departments: '+chosen.map(id=>model.departments.find(d=>d.id===id).name).join(', '),()=>{draft.route=s.route;draft.departments=chosen;if(model.levels.some(l=>l.id===s.level))draft.level=s.level;if(packages.some(p=>p.id===s.packageId))draft.packageId=s.packageId;if(s.goals)draft.goals=s.goals.slice(0,4000);context.navigate('office')},parent)}
 const form=node('form',undefined,'office-chat-compose');const previews=node('div',undefined,'composer-attachments');previews.setAttribute('aria-label','Selected attachments');
 const label=node('label','Message '+person.name,'composer-label');const input=node('textarea');input.rows=1;input.maxLength=2000;input.setAttribute('aria-label','Message '+person.name);input.placeholder='Message '+person.name+'…';label.append(input);
 const footer=node('div',undefined,'composer-controls');const attach=button('',()=>picker.click(),'attach-button');attach.setAttribute('aria-label','Attach files');attach.title='Attach PDF, Word, text or images';attach.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m21 11-9 9a6 6 0 0 1-8.5-8.5l10-10a4 4 0 0 1 5.7 5.7L9 17.4a2 2 0 0 1-2.8-2.8L16 4.8"/></svg>';
 const picker=node('input');picker.type='file';picker.multiple=true;picker.accept='.pdf,.docx,.txt,.jpg,.jpeg,.png,.webp';picker.hidden=true;picker.setAttribute('aria-label','Choose attachments');
 const hint=node('span','PDF, Word, text & images · 4 MB each','composer-hint');const send=node('button',undefined,'composer-send');send.type='submit';send.setAttribute('aria-label','Send message');send.title='Send message';
 const sendIcon=()=>{send.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>'};sendIcon();footer.append(attach,hint,send);form.append(previews,label,footer,picker);
 let files=[];
 cleanupChat=()=>{files.forEach(f=>{if(f.preview)URL.revokeObjectURL(f.preview)});files=[]};
 function refreshComposer(){send.disabled=!historyReady||sending||files.some(f=>f.state!=='ready')||(!input.value.trim()&&!files.length);attach.disabled=sending||files.length>=3;previews.replaceChildren();files.forEach(f=>{const chip=node('div',undefined,'attachment-preview');if(f.preview){const img=node('img');img.src=f.preview;img.alt=f.name;chip.append(img)}const copy=node('span');copy.append(node('strong',f.name),node('small',f.state==='ready'?'Ready to send':f.state==='uploading'?'Uploading…':f.error||'Upload failed'));const remove=button('×',()=>{if(sending)return;files=files.filter(x=>x!==f);if(f.preview)URL.revokeObjectURL(f.preview);refreshComposer()},'remove-attachment');remove.setAttribute('aria-label','Remove '+f.name);remove.title='Remove from this message';remove.disabled=sending;chip.append(copy,remove);previews.append(chip)})}
 input.oninput=()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,160)+'px';refreshComposer()};
 input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!send.disabled)form.requestSubmit()}};
 picker.onchange=async()=>{
  const selected=[...picker.files];picker.value='';
  for(const file of selected){
   if(files.length>=3){remaining.textContent='You can attach up to three files per message.';break}
   if(!/\.(pdf|docx|txt|jpe?g|png|webp)$/i.test(file.name)||file.size<1||file.size>4194304){remaining.textContent='Use PDF, DOCX, TXT, JPG, PNG or WebP files up to 4 MB each.';continue}
   const f={name:file.name,state:'uploading',preview:file.type.startsWith('image/')?URL.createObjectURL(file):null};files.push(f);refreshComposer();
   try{const uploaded=await ctx.upload(file);if(view!==viewVersion)return;Object.assign(f,uploaded,{state:'ready'});remaining.textContent='Attachment ready. Add a message or press Send.'}
   catch(e){if(view!==viewVersion)return;f.state='failed';f.error=e.message;remaining.textContent='Remove the failed attachment and try again.'}
   refreshComposer();
  }
 };
 function fileCards(list,parent){if(!list?.length)return;const cards=node('div',undefined,'message-attachments');list.forEach(f=>{const download=button('📎 '+f.name,async()=>{download.disabled=true;try{const url=await ctx.download(f.id);if(view!==viewVersion)return;const a=node('a');a.href=url+'&download='+encodeURIComponent(f.name);a.download=f.name;a.click()}catch(e){remaining.textContent=e.message}finally{download.disabled=false}},'message-attachment');download.setAttribute('aria-label','Download '+f.name);cards.append(download)});parent.append(cards)}
 const useBrief=button('Use my messages as an office brief',()=>{draft.goals=conversationBrief.slice(0,4000);context.navigate('office')});useBrief.disabled=!conversationBrief;
 const remaining=node('p','Loading your saved conversation…','fine');remaining.setAttribute('role','status');
 const reload=button('Refresh conversation',()=>{target.replaceChildren();renderChat(target,ctx)});actions.append(reload);
 let sending=false,historyReady=false;
 send.disabled=true;
 async function history(){
  try{const rows=await ctx.history(person.id);if(view!==viewVersion)return;
   messages=[];conversationBrief='';log.replaceChildren();bubble(person.name,person.intro,'assistant');
   [...rows].reverse().forEach(row=>{messages.push({who:'client',text:row.user_text});const userMessage=bubble('You',row.user_text,'client');fileCards(row.office_chat_files,userMessage);conversationBrief=(conversationBrief+'\n'+row.user_text).slice(-4000);if(row.state==='complete'&&row.reply){messages.push({who:'assistant',text:row.reply});const savedReply=bubble(person.name,row.reply,'assistant');showOfficeSuggestion(row.suggestion,savedReply)}else bubble('Message status',row.state==='pending'?'This message has no completed reply yet. Refresh shortly; if it stays pending, send a new message.':'This message did not complete. You can send it again.','status')});
   useBrief.disabled=!conversationBrief;historyReady=true;refreshComposer();remaining.textContent='Your latest 30 messages with this character are shown. AI can make mistakes; review proposals before saving.';log.scrollTop=log.scrollHeight;
  }catch(e){if(view!==viewVersion)return;remaining.textContent=e.message+' Use Refresh conversation to try again.'}
 }
 form.onsubmit=async e=>{e.preventDefault();if(sending||!historyReady)return;
  const text=input.value.trim()||(files.length?'Please review the attached file'+(files.length===1?'':'s')+'.':'');if(!text||files.some(f=>f.state!=='ready'))return;
  sending=true;refreshComposer();input.disabled=true;send.textContent='…';remaining.textContent='Preparing your reply…';const userMessage=bubble('You',text,'client');fileCards(files,userMessage);const waiting=bubble(person.name,'Thinking…','chat-waiting');log.scrollTop=log.scrollHeight;
  try{const answer=await ctx.chat(person.id,text,crypto.randomUUID(),files.map(f=>f.id));if(view!==viewVersion)return;
   messages.push({who:'client',text},{who:'assistant',text:answer.reply});waiting.remove();const reply=bubble(person.name,answer.reply,'assistant');conversationBrief=(conversationBrief+'\n'+text).slice(-4000);useBrief.disabled=false;input.value='';input.style.height='auto';cleanupChat();refreshComposer();showOfficeSuggestion(answer.suggestion,reply);log.scrollTop=Math.max(0,reply.offsetTop-log.offsetTop-12);remaining.textContent='Conversation saved. Review any suggested office in the builder.';
  }catch(e){if(view!==viewVersion)return;waiting.textContent='Reply unavailable. '+e.message;remaining.textContent=e.message+' Your text is still in the message box. Refresh the conversation before retrying if the connection was interrupted.'}
  finally{if(view===viewVersion){sending=false;input.disabled=false;sendIcon();refreshComposer()}}
 };
 history();
 const tools=node('details',undefined,'chat-tools');tools.append(node('summary','Office & project actions'),actions,useBrief);panel.append(privacy,log,tools,remaining,form);layout.append(roster,panel);dialog.append(header,layout);target.append(dialog);root.requestAnimationFrame(()=>{if(view===viewVersion&&dialog.isConnected)dialog.showModal()});
}
root.OfficeWorkspace={renderOffice,renderChat,reset(){cleanupChat();++viewVersion;business=null;draft=null;messages=[];conversationBrief='';character='maya';requestedAssistant=null},selectAssistant(id){if(guide.team.some(p=>p.id===id)){character=id;requestedAssistant=id;messages=[];conversationBrief=''}}};
})(window);
