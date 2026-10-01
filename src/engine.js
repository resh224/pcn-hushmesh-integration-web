import {integrationState,integrationGate,repairIntegration,integrationEvidence,note} from './integration.js';
import {sharingParties,organizationName} from './parties.js';
import {scenarios,faults,stages,fixture,currentScenario,handoffs} from './fixtures.js';
export function create(scenario='S01',fault='none',authoritativeOutcome='committed',faultLeg=0,storageMode='external') {
 if(!scenarios[scenario]||!faults.some(f=>f.id===fault)||(fault==='F10'&&scenario!=='S01'))throw Error('Unsupported scenario / failure');
 const s={scenario,fault,storageMode,integrationRecords:[],legIndex:0,faultLeg,...fixture(scenario),tick:0,stage:0,status:'ready',effects:0,attempts:0,trace:[],deliveries:[],registry:{},operationId:'OP-DEMO-1',runRevision:1,reviewedPayload:JSON.stringify(handoffs(scenario)[0].payload),lastStage:0,repaired:false,message:'Ready. Step through the exchange or press Play.',active:'source',authoritativeOutcome};s.integration=integrationState(s,storageMode);return s;
}
function log(s,state,explanation,kind='check',payload) {
 const c=currentScenario(s),reverse=kind==='receipt';
 s.trace.push({tick:s.tick,step:stages[Math.min(s.stage,7)],actor:s.active==='adapter'?'Proposed adapter':s.active==='source'?'Data owner':reverse?'Recipient':'Destination operator',from:reverse?c.destination:c.origin,to:reverse?c.origin:c.destination,kind,state,explanation,eventId:`EV-DEMO-${s.trace.length+1}`,causationId:s.trace.at(-1)?.eventId??'REQUEST-DEMO-1',operationId:s.operationId,correlationId:'RUN-DEMO-1',handoff:s.legIndex+1,...(payload?{payload:structuredClone(payload)}:{})});
 s.trace=s.trace.slice(-50);s.message=explanation;
}
function block(s,text,status='denied'){s.status=status;log(s,status,text);return s;}
export function validate(s){
 const e=s.envelope,a=s.agreement,i=s.identity,m=s.mapping;
 const design=s.integration;
 if(design.execution!=='passed (simulated)'||design.protectedAccess!=='allowed (simulated)')return 'Execution verification does not permit protected-data access.';
 if(design.relationship!=='allowed (simulated)'||!['approved','pre-approved fixture'].includes(design.approval))return 'The relationship or owner decision does not permit this delivery.';
 if(design.revision.requested!==design.revision.approved||design.translation.status!=='passed (simulated)'||design.business!=='accepted by example rules')return 'Revision, translation or business review is incomplete.';
 if(!i.simulatedSignatureValid||i.expiresAtTick<=s.tick||i.issuer!=='ISSUER-DEMO'||i.audience!=='ADAPTER-DEMO')return 'Identity context is invalid or expired.';
 if(!m.approved||m.tenantId!==e.tenantId||m.actorId!==e.actorId)return 'Actor and tenant mapping do not match.';
 if(!e.recipientId||!e.purpose||e.synthetic!==true||e.origin===e.destination)return 'Message context is incomplete or invalid.';
 if(a.revoked||a.endTick<=s.tick||a.recipientId!==e.recipientId||a.assetId!==e.assetId||a.purpose!==e.purpose||Object.keys(e.payload).some(k=>!a.fields.includes(k)))return 'Disclosure agreement does not permit this recipient, asset, purpose, time or field scope.';
 if(JSON.stringify(e.payload)!==s.reviewedPayload)return 'Payload no longer matches the reviewed synthetic packet.';
 if(e.payloadRevision!==s.runRevision||e.digestRef!==`DIGEST-DEMO-${String(s.runRevision).padStart(2,'0')}`)return 'Packet revision or simulated digest binding changed after review.';
 return null;
}
function deliver(s){
 const error=validate(s);if(error)return block(s,error);
 if(s.registry[s.operationId]){log(s,'suppressed','Existing operation found. No second delivery or record.');return;}
 s.registry[s.operationId]={outcome:'committed',resultRef:`RESULT-DEMO-${s.runRevision}`};s.effects++;
 const packet=structuredClone(s.envelope);s.deliveries.push(packet);
 log(s,'committed',s.scenario==='S01'?'PCN recorded a synthetic asset reference (PIN). Endorsement remains a separate authorized decision.':`Only the agreed representation reached ${organizationName(currentScenario(s).recipientId??'RECIPIENT-DEMO')}. The original stays with its owner.`,packet.kind,packet.payload);
}
function receipt(s){s.stage=7;s.lastStage=7;s.active='source';log(s,'received','Return receipt confirms this modeled exchange. It does not prove the business claim is true.','receipt',{resultRef:s.registry[s.operationId]?.resultRef??'RESULT-DEMO',outcome:'received'});s.status=s.legIndex+1<handoffs(s.scenario).length?'ready':'complete';if(s.status==='ready')s.stage=8;}
export function step(s){
 if(!['ready','running','pending'].includes(s.status))return s;
 if(s.stage===8){
 s.integrationRecords.push(structuredClone(s.integration));s.legIndex++;const f=fixture(s.scenario,s.legIndex);Object.assign(s,f);s.runRevision=1;s.operationId=`OP-DEMO-H${s.legIndex+1}-1`;s.envelope.operationId=s.operationId;s.envelope.eventId=`EV-REQUEST-H${s.legIndex+1}`;s.envelope.agreementId=`SDA-DEMO-H${s.legIndex+1}`;s.identity.expiresAtTick=s.tick+100;s.agreement.endTick=s.tick+100;s.reviewedPayload=JSON.stringify(currentScenario(s).payload);s.stage=0;s.attempts=0;s.repaired=false;s.integration=integrationState(s,s.storageMode);
 }
 s.tick++;s.lastStage=s.stage;s.status='running';s.active=s.stage===0?'source':s.stage<6?'adapter':'destination';
 const f=s.repaired||s.legIndex!==s.faultLeg?'none':s.fault;
 const gate=integrationGate(s,f);if(gate)return block(s,gate.text,gate.status);
 if(s.stage===0&&handoffs(s.scenario).length>1)log(s,'requested',`${currentScenario(s).name}. New owner permission is checked for this handoff; previous permission does not carry over.`,'request');
 if(s.stage===0&&handoffs(s.scenario).length===1)log(s,'requested',`${scenarios[s.scenario].short}. Owner: Aster Components (fictional manufacturer). ${s.scenario==='S01'?'Destination: PCN registration service; Northstar is not a recipient of this packet.':'Recipient: Northstar Review (fictional outside reviewer), through its Mesh-side app.'} Original evidence remains in owner-controlled storage.`,'request');
 if(s.stage===1){if(f==='F01')return block(s,'Identity expired. No permission or write is attempted.');if(f==='F02')return block(s,'Issuer / audience mismatch. This identity context is not trusted.');log(s,'checked','Synthetic issuer, audience, expiry and signature-status checks passed. Sign-in does not grant disclosure permission.');}
 if(s.stage===2){if(f==='F03')return block(s,'Public alias has no approved mapping in this tenant. No actor is created automatically.','quarantined');log(s,'checked','Reviewed public alias → PCN actor and asset mapping matches this tenant. No secret identity material crosses the boundary.');}
 if(s.stage===3){if(f==='F04')return block(s,'Required field missing: recipientId. Message rejected.');if(f==='F11a')return block(s,'Mock trust evidence is stale. Freshness must be reviewed separately from identity.','quarantined');if(f==='F11b')return block(s,'Sequence 2 is held: predecessor 1 is missing. Reconciliation is required; timestamps cannot fill the gap.','quarantined');log(s,'checked','Message shape, source context and sequence are valid. Cryptographic and trust checks are simulated.');}
 if(s.stage===4){if(f==='F07')return block(s,'Requested field supplierPrivateNotes is outside the agreement. Entire request denied; no field value is exposed.');log(s,'checked','Owner agreement permits this recipient, asset, purpose and selected fields. Permission will be checked again at delivery.');}
 if(s.stage===5){if(f==='F05')return block(s,'Simulated digest mismatch: payload changed after preview. Owner must create a new reviewed packet.');log(s,'prepared','Reviewed packet is bound to its synthetic revision. A matching digest does not prove a sensor reading is accurate.');}
 if(s.stage===6){
 if(f==='F06')return block(s,'Agreement revoked just before delivery. Cached approval cannot authorize this transfer.');
 if(f==='F09'){s.attempts++;s.status=s.attempts<3?'pending':'review';log(s,s.status,`Destination offline. Attempt ${s.attempts}/3; no delivery or record. ${s.attempts<3?'Next simulated tick retries.':'Operator review required.'}`);return s;}
 s.attempts++;
 if(f==='F10'&&s.authoritativeOutcome!=='committed'){s.status='unknown';log(s,'unknown','Request outcome is unknown. The authoritative mock registry is configured as '+s.authoritativeOutcome+'. Query before any resend.');return s;}
 deliver(s);if(s.status==='denied')return s;
 if(f==='F10'){s.status='unknown';log(s,'unknown','PCN committed the operation, but the reply was lost. Resend is disabled. Query the same operation.');return s;}
 if(f==='F08'){deliver(s);log(s,'suppressed','Stale replay rejected. Stable operation ID prevents a second effect.');}
 }
 if(s.stage===7){receipt(s);if(f==='F11c')log(s,'suppressed','Receipt echo suppressed. Return receipts cannot start a new business operation.');return s;}
 s.stage++;return s;
}
export function recover(s,action){
 if(action==='query'&&['unknown','review'].includes(s.status)&&s.fault==='F10'){
 s.tick++;const found=s.registry[s.operationId];
 if(found){log(s,'reconciled','Authoritative mock query found the existing commit. Same operation ID; no resend.');receipt(s);}
 else if(s.authoritativeOutcome==='pending'){s.status='review';log(s,'pending','Authoritative mock query is pending. Resend remains disabled; ask the PCN operator to reconcile.');}
 else if(s.authoritativeOutcome==='not-found'){repairIntegration(s);s.repaired=true;s.stage=1;s.status='ready';s.attempts=0;log(s,'not-found','Authoritative mock registry confirms absence. Recheck all gates before resubmitting the same operation.');}
 return s;
 }
 if(action==='restore'&&s.status==='review'&&s.fault==='F09'){repairIntegration(s);s.repaired=true;s.stage=1;s.status='ready';s.attempts=0;log(s,'restored','Platform operator restored the destination. Begin a new bounded attempt cycle on the same operation; recheck every gate.');return s;}
 if(action==='repair'&&['denied','quarantined'].includes(s.status)){
 repairIntegration(s);s.repaired=true;s.status='ready';s.stage=1;
 if(['F05','F06','F07'].includes(s.fault)){s.runRevision++;s.operationId=handoffs(s.scenario).length>1?`OP-DEMO-H${s.legIndex+1}-${s.runRevision}`:`OP-DEMO-${s.runRevision}`;s.envelope.operationId=s.operationId;s.envelope.eventId=`EV-REQUEST-${s.runRevision}`;s.envelope.payloadRevision=s.runRevision;s.envelope.digestRef=`DIGEST-DEMO-${String(s.runRevision).padStart(2,'0')}`;s.envelope.agreementId=`SDA-DEMO-${s.runRevision}`;}
 log(s,'review',`${s.fault==='none'?'Data owner: reconsider the withdrawn request.':faults.find(f=>f.id===s.fault).role+': '+faults.find(f=>f.id===s.fault).recovery} All gates are checked again.`);
 }return s;
}
export function decide(s,approve){
 if(s.status!=='awaiting')return s;
 s.integration.approval=approve?'approved':'withdrawn';
 note(s,'approval',approve?'approved':'blocked',approve?'Owner explicitly approved this handoff.':'Owner withdrew this handoff. No delivery.');
 s.status=approve?'ready':'denied';s.message=approve?'Owner approved. Continue to recheck permission and integrity.':'Owner withdrew permission. No data delivered for this handoff.';
 log(s,s.status,s.message);return s;
}
export function exportTrace(s){return {version:'1.0',synthetic:true,notice:'Teaching simulation; no real credentials, verification, vendor API calls or proof of business truth.',scenario:s.scenario,fault:s.fault,status:s.status,operationId:s.operationId,effects:s.effects,integrationDesign:integrationEvidence(s),trace:structuredClone(s.trace),deliveries:structuredClone(s.deliveries)};}

export function evidenceBundle(s){
 const receipts=s.trace.filter(t=>t.kind==='receipt');
 return {
  integrationDesign:integrationEvidence(s),
  schemaVersion:'1.0',artifactType:'synthetic-integration-evidence',synthetic:true,
  warning:'Example evidence from a teaching simulation. No real signatures, identity verification, attestation or vendor transactions. This is not proof that a business claim is true.',
  scenario:s.scenario,operationId:s.operationId,correlationId:'RUN-DEMO-1',outcome:s.status,
  handoffs:handoffs(s.scenario).map((h,i)=>({number:i+1,name:h.name,owner:h.ownerId??'OWNER-DEMO',recipient:h.recipientId??(s.scenario==='S01'?'PCN registration service':'RECIPIENT-DEMO')})),
  parties:{owner:{name:organizationName(currentScenario(s).ownerId??'OWNER-DEMO'),role:'Fictional owner of the current handoff’s data'},recipient:s.scenario==='S01'?{name:'PCN registration service',role:'Modeled registration destination; Northstar receives no packet'}:{name:organizationName(currentScenario(s).recipientId??'RECIPIENT-DEMO'),role:'Fictional recipient of the current handoff'}},
  sharingOrganizations:sharingParties(s),
  assetReference:s.envelope.assetId,
  mechanism:{status:'proposed',transport:'Proposed external HTTPS/REST + JSON; illustrative secure agent messages inside Mesh',nativeVendorContractConfirmed:false},
  custody:'Original source evidence remains with the owner. Only the permitted representation is included.',
  authorization:{agreementReference:s.envelope.agreementId,scope:'Modeled checks only; not a signed authorization credential'},
  deliveredRepresentations:structuredClone(s.deliveries),
  receipts:structuredClone(receipts),
  checks:s.trace.filter(t=>t.kind==='check').map(t=>({tick:t.tick,handoff:t.handoff,operationId:t.operationId,step:t.step,state:t.state,explanation:t.explanation})),
  reconciliation:{outcomeKnownToCaller:s.status==='complete',simulatedEffectCount:s.effects,note:'Effect count is simulator-internal knowledge. A missing reply remains unknown to the caller until reconciliation.'},
  limitations:['No original source files or secret identity material included.','Mock digest references are labels, not cryptographic verification.','A receipt is not endorsement, attestation or a validated credential.']
 };
}
