import {faults,currentScenario,handoffs} from './fixtures.js';
import {organizationName} from './parties.js';
// Proposed transport only. Membership and actual vendor endpoints remain illustrative.
export function exchangeView(s){
 const c=currentScenario(s),registering=s.scenario==='S01',stage=s.lastStage,started=s.trace.length>0;
 const ownerName=organizationName(c.ownerId??'OWNER-DEMO'),recipientName=registering?'PCN registration service':organizationName(c.recipientId??'RECIPIENT-DEMO');
 const source=`${ownerName} · ${c.origin==='mesh'?'Mesh-side app':'PCN-side owner service'}`;
 const destination=registering?recipientName:`${recipientName} · ${c.destination==='mesh'?'Mesh-side app':'PCN-side service'}`;
 const blocked=['awaiting','denied','quarantined','pending','review','unknown'].includes(s.status);
 let from=source,to='Proposed adapter',message='Request + selected packet',mechanism='External leg: proposed HTTPS / REST with JSON. Mesh leg: secure agent messages (illustrated).',phase='Ready to send',lane='';
 if(started&&stage===0){phase='1 · Submit to the adapter';lane=c.origin+'-in';}
 if(started&&stage>0&&stage<6){from='Proposed adapter';to='Proposed adapter';message='Identity, mapping, message, permission and integrity checks';mechanism='Local adapter processing · no data transfer';phase='2 · Check before forwarding';}
 if(started&&stage===6){from='Proposed adapter';to=destination;message='Allowed fields: '+Object.keys(c.payload).join(', ');mechanism='External leg: proposed HTTPS / REST with JSON. Mesh leg: secure agent messages (illustrated).';phase='3 · Deliver the permitted packet';lane=c.origin+'-out';}
 if(started&&stage===7){from=destination;to=source;message=registering?'Registration result + synthetic PIN':'Delivery acknowledgment + audit reference';mechanism='Proposed application reply via the adapter · external HTTPS / JSON plus internal Mesh agent messages';phase=s.stage===8?'Handoff finished · Step continues to the next handoff':'4 · Return the result';lane='receipt-'+c.origin;}
 if(blocked){phase=s.status==='unknown'?'Reply missing · outcome requires reconciliation':'Exchange stopped · no onward transfer';mechanism=s.status==='unknown'?'Query the same operation before any resend':'No successful transfer at this boundary';lane='';}
 if(!started)lane='';
 const owner='Aster Components is a fictional manufacturer and data owner. In the OSAT examples, Harbor owns its test reports and Northstar owns its review decisions.';
 const recipient='Northstar Review is a fictional outside reviewer using Mesh. Harbor Assembly & Test is a fictional PCN-only OSAT: a company that assembles and tests chips for others. Roles depend on the current handoff.';
 let person=ownerName+' · data owner',action=registering?'Aster registers a Data Object in PCN. Original evidence stays with Aster. Northstar and Harbor receive no packet.':`${ownerName} authorizes this packet for ${recipientName}. The original files stay with their owner. Permission does not automatically carry over to the next handoff.`;
 if(stage>0&&stage<6&&started){person=stage===4?ownerName+' · permission owner':'Integration operator · proposed adapter';action=stage===4?`Apply ${ownerName}’s agreement for ${recipientName}, this asset, these fields and this purpose.`:'Check the account, organization, message and sharing rules. Network membership alone grants no access.';}
 if(stage===6&&started){person=recipientName+' · receiving side';action=registering?'PCN records a synthetic Data Object reference and history; the original evidence stays with Aster.':`${recipientName} receives only the allowed representation. This is an information exchange, not a command to factory equipment.`;}
 if(stage===7&&started){person=recipientName+' · sends the result';action=`The reply returns to ${ownerName} through the adapter. A receipt is not proof of truth or permission for another transfer.`;}
 if(blocked){person=faults.find(f=>f.id===s.fault)?.role??'Integration operator';action=s.status==='unknown'?'The reply is missing. Query the original operation before resending.':'Resolve the failed check. No onward data delivery is shown while this boundary is blocked; earlier completed handoffs remain recorded.';}
 if(s.status==='awaiting'){phase='Owner approval pending';person=ownerName+' · decision owner';action='A notification has arrived. Approve this handoff or withdraw it; no data moves while the decision is pending.';}
 return {from,to,message,mechanism,phase,lane,owner,recipient,person,action};
}

// A readable proposed wire format, separate from the simulator's internal envelope schema.
export function packetPreview(s){
 const c=currentScenario(s),route=exchangeView(s),lastReceipt=s.trace.filter(t=>t.kind==='receipt'&&t.operationId===s.operationId).at(-1);
 const stopped=['awaiting','denied','quarantined','pending','review','unknown'].includes(s.status);
 const base={format:'proposed-example-v1',synthetic:true,operationId:s.operationId,assetReference:s.envelope.assetId};
 if(stopped)return {label:'Local status only — no successful outgoing packet is shown at this stopped step.',packet:{...base,kind:'local_status',status:s.status,reason:s.message}};
 if(lastReceipt&&s.lastStage===7)return {label:'Example return packet — acknowledges the result, not the truth of the data.',packet:{...base,kind:'receipt',from:route.from,to:route.to,via:'proposed adapter',data:structuredClone(lastReceipt.payload)}};
 const checking=s.trace.length>0&&s.lastStage>0&&s.lastStage<6;
 return {label:checking?'Packet being checked inside the adapter — not forwarded yet.':s.lastStage===6&&s.trace.length?'Example packet delivered in this simulation.':'Prepared example request — not proof of delivery.',packet:{...base,kind:s.scenario==='S01'?'register_data_object':s.scenario==='S03'?'share_review_result':'share_selected_data',from:checking?'Source application (packet held at adapter)':route.from,to:checking?'Proposed adapter':route.to,handoff:s.legIndex+1,owner:organizationName(c.ownerId??'OWNER-DEMO'),recipient:s.scenario==='S01'?'PCN registration service':organizationName(c.recipientId??'RECIPIENT-DEMO'),purpose:s.envelope.purpose,agreementReference:s.envelope.agreementId,data:structuredClone(s.envelope.payload)}};
}
