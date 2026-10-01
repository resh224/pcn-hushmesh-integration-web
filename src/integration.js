// Generic teaching model only. No partner cryptography or native API is implemented.
import {currentScenario} from './fixtures.js';
export function integrationState(s,storage='external') {
 const c=currentScenario(s);
 return {handoff:(s.legIndex??0)+1,storage,execution:'not checked',protectedAccess:'not checked',relationship:'not checked',approval:'not requested',notification:'not sent',business:'not checked',revision:{objectId:s.scenario==='S07'?'PLAN-DEMO-42':s.envelope.assetId,requested:2,approved:2,status:'not checked'},translation:{mappingVersion:'MAP-DEMO-2',codeVersion:'TRANSLATOR-DEMO-1',source:s.scenario==='S07'&&(s.legIndex??0)===0?{limit_mV:1200,plan_revision:2}:structuredClone(c.payload),output:null,status:'not checked'},history:[]};
}
export function note(s,event,outcome,detail){s.integration.history.push({tick:s.tick,event,outcome,detail});}
export function integrationGate(s,f){
 const i=s.integration;
 const fail=(field,text,status='denied')=>{if(field==='revision')i.revision.status='blocked';else if(field==='translation')i.translation.status='blocked';else i[field]='blocked';note(s,field,'blocked',text);return {text,status};};
 if(s.stage===1){if(f==='F15'){i.protectedAccess='denied';return fail('execution','Agent verification failed. Protected-data access is denied; external PCN software is outside this verification boundary.','quarantined');}i.execution='passed (simulated)';i.protectedAccess='allowed (simulated)';note(s,'execution','passed','Approved execution environment simulated; this does not establish data truth.');}
 if(s.stage===3){
 if(f==='F13'){i.translation.output={value:1200,unit:'V'};return fail('translation','Wrong units after translation. 1200 mV must not be treated as 1200 V. Hold for mapping-owner review.');}
 i.translation.output=structuredClone(s.envelope.payload);
 if(s.scenario==='S07'&&s.legIndex===0)i.translation.output.maxVoltageV=i.translation.source.limit_mV/1000;
 if(JSON.stringify(i.translation.output)!==JSON.stringify(s.envelope.payload))return fail('translation','Translated data does not match the reviewed packet. Mapping owner must review it.');
 i.translation.status='passed (simulated)';note(s,'translation','passed','Message fields and units checked against the proposed mapping version.');
 }
 if(s.stage===4){
 if(f==='F14')return fail('relationship','The relationship does not allow this action. Signing in alone cannot grant access.');
 i.relationship='allowed (simulated)';
 if(f==='F16'){i.notification='not acknowledged';return fail('approval','The approval notification was not acknowledged. No automatic approval; resend and ask the owner.');}
 if(s.scenario==='S07'&&i.approval!=='approved'){
 i.notification='delivered (simulated)';i.approval='pending';note(s,'approval','pending','Owner received a proposed notification; awaiting an explicit decision.');return {text:'The data owner has been notified. Review this handoff and choose Approve or Withdraw. No data has been delivered for this handoff.',status:'awaiting'};
 }
 if(s.scenario!=='S07'){i.approval='pre-approved fixture';i.notification='not required by fixture';}
 }
 if(s.stage===5){
 if(f==='F12'){i.revision.requested=1;return fail('revision','Old revision requested: revision 1 is not the approved revision 2. Hold delivery until the owner selects the approved plan.');}
 i.revision.status='passed (simulated)';
 if(f==='F17'){i.business='rejected';i.businessAssessment={rulesVersion:'BUSINESS-RULES-DEMO-1',decision:'incorrect example decision',accepted:false};note(s,'business','blocked','Approved software produced an incorrect example result. Verified execution does not mean bug-free logic.');return {text:'The software passed execution checks, but its example result failed business review. Record a correction before sharing.',status:'denied'};}
 i.business='accepted by example rules';note(s,'business','passed','Synthetic policy checks accepted the result. This is not proof of real-world truth.');
 }
 return null;
}
export function repairIntegration(s){
 const i=s.integration;
 if(s.fault==='F17')i.history.push({tick:s.tick,event:'rejected-result',outcome:'retained',result:structuredClone(i.businessAssessment)});
 note(s,'recovery','corrected',s.fault==='F17'?'Retain rejected result; corrected example result uses business rules version 2.':'Reviewed correction; repeat checks and request owner approval again.');
 i.execution='not checked';i.protectedAccess='not checked';i.relationship='not checked';i.approval='not requested';i.notification='not sent';i.business='not checked';i.revision.requested=i.revision.approved;i.revision.status='not checked';i.translation.status='not checked';i.translation.output=null;
 if(s.fault==='F17'){i.businessRulesVersion='BUSINESS-RULES-DEMO-2';i.businessAssessment={rulesVersion:i.businessRulesVersion,decision:'corrected example decision',accepted:true};}
}
export function integrationEvidence(s){return {simulated:true,nativeContractConfirmed:false,storage:s.storageMode,storageQualification:'Mesh Qualified Storage remains a proposed option requiring PCN assessment.',trustBoundary:'External PCN applications and the truth of submitted data are not verified by Mesh agent attestation.',transport:{external:'Proposed HTTPS/REST with JSON',insideMesh:'Illustrative secure messages between agents; no native wire format claimed',notifications:'Proposed webhook or in-app notification; contract to confirm'},handoffRecords:[...structuredClone(s.integrationRecords),structuredClone(s.integration)]};}
const safe=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function boundaryView(s){
 const i=s.integration,blocked=!['ready','running','complete'].includes(s.status),moving=s.trace.length>0&&!blocked&&[0,6,7].includes(s.lastStage),reverse=s.lastStage===7;
 // Left is PCN, right is Mesh; return receipts reverse the selected handoff.
 const forward=(currentScenario(s).origin==='pcn')!==reverse;
 const arrow=forward?'→':'←';
 return `<div class="boundary-title"><h3>Where does Mesh verification begin?</h3><span class="badge">Proposed design · all checks simulated</span></div>
 <div class="trust-route ${moving?'route-moving':''}">
 <div class="external-zone"><span class="eyebrow">OUTSIDE MESH VERIFICATION</span><strong>PCN application / gateway</strong><p>Knows the PCN party, record and disclosure agreement. Its own checks remain its responsibility.</p></div>
 <div class="route-link"><b>${moving?arrow:'↔'}</b><span>Proposed HTTPS / REST + JSON</span><small>Requests and replies</small></div>
 <div class="mesh-zone"><span class="eyebrow">PROPOSED MESH EXECUTION BOUNDARY</span><div class="agent-chain"><div><strong>Representative agent</strong><p>Checks the external request. Acts for the PCN participant.</p></div><div class="route-link"><b>${moving?arrow:'↔'}</b><span>Secure agent messages</span><small>Relationship + allowed action</small></div><div><strong>Translation / file agent</strong><p>Runs agreed rules. Handles data or a permitted representation.</p></div></div></div></div>
 <p class="boundary-note">${moving?(reverse?'Return receipt':'Request or permitted data')+' follows the arrows.':'No transfer shown while checks or decisions are pending.'} This describes logical software roles, not one dedicated server per agent. Verifying the agent does not verify external PCN code or prove submitted facts.</p>
 <div class="assurance-grid">${[['Execution',i.execution],['Protected access',i.protectedAccess],['Relationship / action',i.relationship],['Owner decision',i.approval],['Business result',i.business]].map(([k,v])=>`<div><small>${k}</small><strong>${safe(v)}</strong></div>`).join('')}</div>
 <p><strong>Storage:</strong> ${s.storageMode==='mesh'?'Proposed Mesh Qualified Storage agent → Mesh file service. PCN qualification, lifecycle rules and access contract still need agreement.':'External owner storage → permitted representation through the proposed connector. Original files stay in the owner’s storage.'} Changing the storage option starts a new exercise.</p>
 <details class="design-details"><summary>Revision, translation and approval details</summary><div class="design-grid"><div><h4>Stable object, approved revision</h4><p>${safe(i.revision.objectId)} · requested revision ${i.revision.requested} · approved revision ${i.revision.approved}</p><p>Revision 1: superseded. Revision 2: approved. Revision 3: draft, not approved. “Newest” does not mean “approved.” These are separate from the packet’s own revision.</p><p>Status: ${i.revision.status}</p></div><div><h4>Translation agent</h4><p>${i.translation.mappingVersion} / ${i.translation.codeVersion}. Proposed example, not a vendor format.</p><pre>${safe(JSON.stringify({input:i.translation.source,output:i.translation.output,status:i.translation.status},null,2))}</pre></div><div><h4>Notification and decision</h4><p>Notification: ${i.notification}</p><p>Owner decision: ${i.approval}</p><p>S07 requires a separate owner decision at every handoff. Other scenarios use an explicitly pre-approved fixture.</p></div></div></details>`;
}
export const decisionsHTML=`<section class="requirements"><h3>Decisions still needed</h3><p>These are partner design decisions, not capabilities proven by this simulator.</p><div class="cards">${[
 ['External interface','PCN + Mesh integration owners','Agree on request/reply formats, authentication, errors and notification delivery. REST is proposed; internal Mesh agent messages are a different mechanism.'],
 ['Shared meaning','Domain expert + mapping owner','Agree on identifiers, units, approved revisions and translation tests. A valid JSON shape can still carry the wrong meaning.'],
 ['Storage qualification','PCN storage owner + Mesh operator','Assess the proposed Mesh Qualified Storage option, retention, recovery and file-version rules.'],
 ['Verification policy','Security owners on both sides','Agree on accepted execution evidence, freshness and who makes the trust decision. External software remains outside the Mesh verification boundary.'],
 ['Approval and correction','Data owner + quality reviewer','Decide who may approve, withdraw, correct or reject. Keep a record of old results and corrections.'],
 ['Agent deployment','Mesh partner team + delivery lead','Confirm development access, supported deployment process, hosting and operating responsibility before a real pilot. No roadmap date is assumed.']
 ].map(([title,owner,copy])=>`<article class="card"><h4>${title}</h4><small>Decision owner: ${owner}</small><p>${copy}</p><span class="badge">Needs agreement</span></article>`).join('')}</div><p><strong>Standards are not interchangeable:</strong> external identity standards do not define native Mesh relationship credentials. A JSON schema checks structure, not meaning. Attestation concepts do not establish a supported vendor profile. Real profiles and conformance tests require partner agreement.</p></section>`;
