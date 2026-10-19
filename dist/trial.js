(function(){
'use strict';
const model=window.TrialModel,form=document.querySelector('#trial-form'),choices=document.querySelector('#trial-choices'),feedback=document.querySelector('#trial-feedback');
const selected=new Set();
model.services.forEach(service=>{const label=document.createElement('label');label.className='trial-option';const input=document.createElement('input');input.type='checkbox';input.value=service.id;const copy=document.createElement('span');const department=document.createElement('small');department.textContent=service.department;const title=document.createElement('strong');title.textContent=service.name;const scope=document.createElement('span');scope.textContent=service.scope;copy.append(department,title,scope);label.append(input,copy);choices.append(label);input.onchange=()=>{if(input.checked&&selected.size>=2){input.checked=false;feedback.textContent='Choose up to two deliverables. Uncheck one to change your selection.';return}if(input.checked)selected.add(service.id);else selected.delete(service.id);feedback.textContent=selected.size+' of 2 selected.'}});
document.querySelector('#trial-terms-copy').textContent=model.terms;
form.onsubmit=e=>{e.preventDefault();try{const draft=model.brief([...selected],form.elements.business.value,form.elements.goal.value);sessionStorage.setItem('agenticcore.pendingBrief',JSON.stringify(draft));location.href='workspace.html?trial=launch'}catch(error){feedback.textContent=error.message;feedback.focus()}};
})();
