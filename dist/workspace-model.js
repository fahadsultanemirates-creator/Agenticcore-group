(function(root){
const labels={submitted:'Submitted',reviewing:'In review',needs_information:'Needs information',scoped:'Scope prepared',closed:'Closed',planned:'Planned',in_progress:'In progress',awaiting_approval:'Awaiting approval',blocked:'Blocked',completed:'Completed'};
function status(v){return labels[v]||'Status unavailable'}
function summary(requests,projects){return {requests:requests.filter(r=>r.status!=='closed').length,active:projects.filter(p=>!['completed','planned'].includes(p.status)).length,approvals:projects.filter(p=>p.status==='awaiting_approval').length}}
function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
const api={status,summary,safeUrl};root.WorkspaceModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
