const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dist=path.join(__dirname,'../dist');
const model=require(path.join(dist,'office-model.js')),packages=require(path.join(dist,'owned-office-model.js')),guide=require(path.join(dist,'office-assistant-model.js'));
assert.equal(guide.team.length,10);assert.equal(new Set(guide.team.map(p=>p.id)).size,10);
assert.deepEqual(guide.recommend('Social posts and bookkeeping'),['marketing','finance']);
assert.deepEqual(guide.recommend('I have a bakery'),[]);
assert.deepEqual(guide.reply('status',guide.team[1],{requests:[{}],projects:[]},model).ids,[]);
assert.match(guide.reply('status',guide.team[1],{requests:[{}],projects:[]},model).text,/1 request\(s\) and 0 project/);
for(let mask=1;mask<128;mask++)for(const level of model.levels){
 const departments=model.departments.filter((_,i)=>mask&(1<<i)).map(d=>d.id);
 const s=guide.snapshot({route:'managed',departments,level:level.id},model,packages);
 assert.equal(s.total,model.calculate(departments,level.id).total);assert.equal(s.installment*4,s.total);
 assert.equal(s.allowances.length,departments.length);assert.match(guide.describe(s,model),/Awaiting scope confirmation/);
}
for(const p of packages){const s=guide.snapshot({route:'owned',packageId:p.id},model,packages);assert.equal(s.total,p.price);assert.equal(s.installment,p.price/4);assert.match(guide.describe(s,model),/Ongoing API/)}
assert.throws(()=>guide.snapshot({route:'managed',departments:[],level:'essential'},model,packages),/at least one/);
assert.throws(()=>guide.snapshot({route:'owned',packageId:'unknown'},model,packages),/Choose an office build/);
assert.throws(()=>guide.snapshot({route:'unknown'},model,packages));

// Run real UI handlers with an in-memory DOM; no account or live API writes.
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={setProperty(){}};this.isConnected=true;this.value='';this.disabled=false;this.hidden=false;this.textContent=''}
 append(...children){for(const child of children)if(child instanceof Element)child.parent=this;this.children.push(...children)}
 replaceChildren(...children){this.children=[];this.append(...children)}
 showModal(){this.open=true}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this)}
 setAttribute(k,v){this.attributes[k]=v}
 focus(){}
 click(){this.clicked=true}
}
const document={createElement:tag=>new Element(tag)};
const root={requestAnimationFrame:fn=>fn(),OfficeModel:model,OfficeAssistantModel:guide,OwnedOfficePackages:packages,WorkspaceModel:require(path.join(dist,'workspace-model.js'))};
vm.runInNewContext(fs.readFileSync(path.join(dist,'office-workspace.js'),'utf8'),{window:root,document,console,crypto:require('node:crypto').webcrypto});
const office=root.OfficeWorkspace;
function all(el){return [el,...el.children.filter(x=>x instanceof Element).flatMap(all)]}
function find(el,predicate){const match=all(el).find(predicate);assert.ok(match,'Expected element');return match}
function byText(el,tag,text){return find(el,e=>e.tag===tag&&e.textContent===text)}
function field(el,name){return find(el,e=>e.name===name)}
let calls=[],navigations=[],refreshes=0,release;
const ctx={organization:{id:'business-a',name:'Example business'},role:'owner',records:{requests:[],projects:[]},notice(){},history:async()=>[],chat:async(character,text,id)=>({reply:'Consider marketing and finance.',suggestion:{route:'managed',departments:['marketing','finance'],level:'essential',packageId:'starter',goals:text}}),navigate:tab=>navigations.push(tab),save:async(route,brief)=>{calls.push({route,brief});await new Promise(r=>release=r)},saved:async()=>refreshes++};
async function main(){
 const target=new Element('main');office.renderOffice(target,ctx);
 const save=byText(target,'button','Save office proposal');assert.equal(save.disabled,true);
 const checkbox=find(target,e=>e.tag==='input'&&e.value==='marketing');checkbox.checked=true;checkbox.onchange();assert.equal(save.disabled,false);
 field(target,'goals').value='Prepare launch posts';field(target,'goals').oninput();
 const form=find(target,e=>e.tag==='form');const event={preventDefault(){}};
 const pending=form.onsubmit(event);checkbox.onchange();await form.onsubmit(event);assert.equal(calls.length,1);assert.equal(save.disabled,true);
 assert.equal(calls[0].brief.kind,'office_configuration');assert.equal(calls[0].brief.configuration.total,200);assert.equal(calls[0].brief.configuration.goals,'Prepare launch posts');
 release();await pending;assert.equal(refreshes,1);
 const owned=field(target,'route');owned.value='owned';owned.onchange();const ownedSave=form.onsubmit(event);assert.equal(calls[1].route,'owned');assert.equal(calls[1].brief.configuration.total,1500);release();await ownedSave;
 const viewer=new Element('main');office.renderOffice(viewer,{...ctx,role:'viewer'});const viewerSave=byText(viewer,'button','Save office proposal');assert.equal(viewerSave.disabled,true);await find(viewer,e=>e.tag==='form').onsubmit(event);assert.equal(calls.length,2);
 const other=new Element('main');office.renderOffice(other,{...ctx,organization:{id:'business-b',name:'Other business'}});assert.equal(field(other,'goals').value,'');assert.equal(field(other,'officeName').value,'Other business');assert.equal(byText(other,'button','Save office proposal').disabled,true);
 const chat=new Element('main');office.renderChat(chat,ctx);await new Promise(resolve=>setImmediate(resolve));assert.equal(all(chat).filter(e=>e.attributes['aria-pressed']).length,10);
 assert.equal(find(chat,e=>e.tag==='dialog').open,true);assert.equal(find(chat,e=>e.attributes['aria-label']==='Maya portrait').attributes.role,'img');
assert.ok(all(chat).some(e=>e.attributes['aria-label']==='Attach files'));assert.ok(all(chat).some(e=>e.attributes['aria-label']==='Send message'));
 const chatForm=find(chat,e=>e.tag==='form'),message=find(chatForm,e=>e.tag==='textarea');message.value='I need social posts and bookkeeping';await chatForm.onsubmit(event);
 assert.ok(all(chat).some(e=>e.tag==='p'&&e.textContent==='Consider marketing and finance.'));assert.equal(find(chat,e=>e.tag==='details'&&e.className==='chat-suggestion').open,undefined);
 byText(chat,'button','Review this office suggestion').onclick();assert.equal(navigations.at(-1),'office');
 const suggested=new Element('main');office.renderOffice(suggested,ctx);assert.equal(find(suggested,e=>e.value==='marketing').checked,true);assert.equal(find(suggested,e=>e.value==='finance').checked,true);
 const forgeButton=find(chat,e=>e.tag==='button'&&e.attributes['aria-label']==='Forge — available with an active package');assert.equal(forgeButton.disabled,true);
 office.selectAssistant('forge');const unpaid=new Element('main');office.renderChat(unpaid,ctx);assert.ok(all(unpaid).some(e=>e.tag==='h3'&&e.textContent.startsWith('Maya /')));
 const paidContext={...ctx,records:{...ctx.records,packageAccess:[{organization_id:'business-a',ends_at:new Date(Date.now()+86400000).toISOString()}]}};
 office.selectAssistant('forge');const paid=new Element('main');office.renderChat(paid,paidContext);assert.ok(all(paid).some(e=>e.tag==='h3'&&e.textContent.startsWith('Forge /')));
 office.selectAssistant('forge');const expired=new Element('main');office.renderChat(expired,{...paidContext,records:{...ctx.records,packageAccess:[{organization_id:'business-a',ends_at:'2020-01-01T00:00:00Z'}]}});assert.ok(all(expired).some(e=>e.tag==='h3'&&e.textContent.startsWith('Maya /')));
 office.selectAssistant('forge');const wrongBusiness=new Element('main');office.renderChat(wrongBusiness,{...paidContext,records:{...ctx.records,packageAccess:[{organization_id:'business-b',ends_at:new Date(Date.now()+86400000).toISOString()}]}});assert.ok(all(wrongBusiness).some(e=>e.tag==='h3'&&e.textContent.startsWith('Maya /')));
 let attachmentArgs;
 const uploadTarget=new Element('main');office.renderChat(uploadTarget,{...ctx,upload:async file=>({id:'file-1',name:file.name,mime:file.type,size:file.size}),chat:async(character,text,id,ids)=>{attachmentArgs={text,ids};return {reply:'I read the attachment.',suggestion:{route:'none'}}}});await new Promise(resolve=>setImmediate(resolve));
 const picker=find(uploadTarget,e=>e.tag==='input'&&e.type==='file');picker.files=[{name:'notes.txt',type:'text/plain',size:12}];await picker.onchange();assert.ok(all(uploadTarget).some(e=>e.tag==='strong'&&e.textContent==='notes.txt'));
 const attachForm=find(uploadTarget,e=>e.tag==='form');await attachForm.onsubmit(event);assert.equal(attachmentArgs.ids.join(','),'file-1');assert.match(attachmentArgs.text,/review the attached file/);assert.ok(all(uploadTarget).some(e=>e.tag==='p'&&e.textContent==='I read the attachment.'));
 office.selectAssistant('amara');const amara=new Element('main');office.renderChat(amara,ctx);assert.ok(all(amara).some(e=>e.tag==='h3'&&e.textContent.startsWith('Amara /')));
 office.reset();const afterLogout=new Element('main');office.renderOffice(afterLogout,ctx);assert.equal(field(afterLogout,'goals').value,'');assert.equal(byText(afterLogout,'button','Save office proposal').disabled,true);
 console.log('Office workspace checks passed: shared pricing for 381 managed selections and 4 builds; duplicate-save guard, viewer access, business isolation, ten assistants and chat-to-builder handoff.');
}
main().catch(e=>{console.error(e);process.exit(1)});
