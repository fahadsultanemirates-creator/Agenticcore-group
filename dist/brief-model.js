(function(root){
const approvalLabels={review:'Review every external action first',recurring:'Discuss approval rules for specific recurring work',help:'Help me choose approval rules'};
function value(v,fallback='To be clarified'){return typeof v==='string'&&v.trim()?v.trim():fallback}
function describe(data){
const pending=[];
if(!value(data.businessContext,''))pending.push('Clarify the business, audience and market.');
if(!value(data.firstTasks,''))pending.push('Choose the first tasks and define their outputs.');
if(!value(data.materials,''))pending.push('Agree the required materials and how they will be shared securely.');
pending.push('Confirm scope, allowance consumption, revision limits and an accepted delivery deadline.');
if(data.approval!=='review')pending.push('Agree specific approval rules; no recurring external actions are authorized by this brief.');
pending.push('Confirm channel availability, verified contact details and reporting preferences during onboarding.');
return [
'BUSINESS CONTEXT',
'Description: '+value(data.businessContext),
'Stage: '+value(data.stage),
'Website / social page: '+value(data.businessUrl,'Not provided'),
'',
'FIRST WORK PLAN',
'Requested tasks: '+value(data.firstTasks),
'Requested first deadline: '+value(data.firstDeadline,'Not specified')+' (not yet accepted)',
'Available materials: '+value(data.materials),
'',
'WORKING PREFERENCES',
'Approval preference: '+(approvalLabels[data.approval]||approvalLabels.review),
'Time zone: '+value(data.timeZone,'To be confirmed'),
'Summary time: '+value(data.summaryTime,'To be confirmed')+' in the stated time zone',
'Quiet hours / preferences: '+value(data.quietHours,'To be confirmed'),
'No action, connection or recurring workflow is authorized by these preferences.',
'',
'BEFORE YOUR OFFICE CAN START',
...pending.map(x=>'- '+x)
].join('\n');
}
const api={describe};root.BriefModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
