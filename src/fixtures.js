export const scenarios = {
 S01:{name:'Register a Data Object in PCN',short:'Register a Data Object',origin:'mesh',destination:'pcn',description:'Aster submits information about its data through the proposed bridge. PCN records a reference and returns a record ID. The original evidence stays with Aster.',payload:{temperatureC:42,testStatus:'pass'}},
 S02:{name:'Share selected data with Mesh',short:'Share selected data',origin:'pcn',destination:'mesh',description:'Send only the data the owner allows to a reviewer using Mesh. The reviewer sends a delivery reply.',payload:{temperatureC:42,testStatus:'pass'}},
 S03:{name:'Share a review result with Mesh',short:'Share a review result',origin:'pcn',destination:'mesh',description:'Send the reviewer name, standard used, and result to Mesh. Keep the supporting evidence with its owner.',payload:{evaluatorId:'REVIEWER-DEMO',standardRef:'STANDARD-DEMO',evaluationResult:'reviewed'}}
};
// Proposed multi-party examples: each handoff has its own owner, permission and operation.
const leg=(name,ownerId,recipientId,origin,destination,payload)=>({name,short:name,ownerId,recipientId,origin,destination,payload});
Object.assign(scenarios,{
 S04:{name:'OSAT testing and outside review',short:'Coordinate testing and review',description:'Aster sends a test request to Harbor Assembly & Test, a fictional PCN-only OSAT. Harbor then shares its test summary with Northstar on Mesh. OSAT means outsourced semiconductor assembly and test.',legs:[
 leg('Aster → Harbor: test request','OWNER-DEMO','OSAT-DEMO','mesh','pcn',{lotId:'LOT-DEMO-42',testPlanRef:'PLAN-DEMO-A',packageType:'example-package'}),
 leg('Harbor → Northstar: test summary','OSAT-DEMO','RECIPIENT-DEMO','pcn','mesh',{lotId:'LOT-DEMO-42',testSummary:'pass',testStatus:'pass'})]},
 S05:{name:'OSAT issue and rework approval',short:'Review an OSAT issue',description:'Harbor reports a packaging issue to Aster. Aster reviews it and sends a proposed rework approval back. This shares information only; it does not control factory equipment.',legs:[
 leg('Harbor → Aster: issue report','OSAT-DEMO','OWNER-DEMO','pcn','mesh',{lotId:'LOT-DEMO-42',testStatus:'hold',testSummary:'package inspection needed'}),
 leg('Aster → Harbor: rework approval','OWNER-DEMO','OSAT-DEMO','mesh','pcn',{lotId:'LOT-DEMO-42',disposition:'approved for example rework',instructionRef:'REWORK-DEMO-1'})]},
 S06:{name:'OSAT result and customer review',short:'Share results with a customer',description:'Harbor shares a limited result with Northstar for review. Northstar creates its own review decision and shares that with Aster on the PCN side. Permission for the first handoff does not authorize the second.',legs:[
 leg('Harbor → Northstar: limited result','OSAT-DEMO','RECIPIENT-DEMO','pcn','mesh',{lotId:'LOT-DEMO-42',testStatus:'pass'}),
 leg('Northstar → Aster: review decision','RECIPIENT-DEMO','OWNER-DEMO','mesh','pcn',{lotId:'LOT-DEMO-42',reviewResult:'accepted for example review',evaluatorId:'REVIEWER-DEMO'})]}
});
export function currentScenario(s){return scenarios[s.scenario].legs?.[s.legIndex??0]??scenarios[s.scenario];}
export function handoffs(id){return scenarios[id].legs??[scenarios[id]];}

export const faults = [
 ['none','No failure','Let the exchange finish normally.','None','No recovery needed.'],
 ['F01','Sign-in expired','The sender’s sign-in is too old to use.','Identity owner','Renew the simulated sign-in and check again.'],
 ['F02','Wrong sign-in details','The sign-in came from the wrong service or was meant for another app.','Identity owner','Use the expected sign-in service and app, then check again.'],
 ['F03','Account not recognized','The sender’s account is unknown or belongs to another organization.','Integration operator','Confirm the account belongs to the right organization, then check again.'],
 ['F04','Missing information','The message does not say who should receive it.','Adapter maintainer','Add the missing recipient and check again.'],
 ['F05','Data changed after review','The data has changed since it was checked.','Data owner','Have the owner submit the updated data for a new review.'],
 ['F06','Permission withdrawn','The owner withdraws permission just before the data is sent.','Data owner','Have the owner grant new permission, then make a new request.'],
 ['F07','Too much data requested','The reviewer asks for data the owner did not agree to share.','Recipient','Make a new request for only the allowed data.'],
 ['F08','Message sent twice','The same message arrives again. It must not create a second record or delivery.','Integration operator','Use the first result and ignore the repeated message.'],
 ['F09','Receiving system offline','The system receiving the data cannot be reached.','Platform operator','Try up to three times. Restore the connection and check permission before retrying.'],
 ['F10','PCN reply missing','PCN may have saved the record, but the sender did not get a reply.','PCN operator','Ask PCN what happened before sending the data again.'],
 ['F11a','Security evidence too old','The security evidence is too old to rely on.','Security reviewer','Provide newer simulated security evidence and check again.'],
 ['F11b','Messages in the wrong order','The second message arrives before the first.','Integration operator','Find and check the first message before processing the second.'],
 ['F11c','Reply sent around again','A delivery reply is mistaken for new data and sent around again.','Integration operator','Stop the repeated reply. Do not treat it as new data.']
].map(([id,name,description,role,recovery])=>({id,name,description,role,recovery}));
export const stages = ['Request','Identity','Mapping','Message','Permission','Integrity','Delivery','Receipt'];
export function fixture(scenario='S01',legIndex=0) {
 const c=scenarios[scenario].legs?.[legIndex]??scenarios[scenario];
 const owner=c.ownerId??'OWNER-DEMO',recipient=c.recipientId??(scenario==='S01'?'PCN-SERVICE-DEMO':'RECIPIENT-DEMO');
 return {identity:{issuer:'ISSUER-DEMO',audience:'ADAPTER-DEMO',expiresAtTick:100,simulatedSignatureValid:true},mapping:{tenantId:'TENANT-DEMO',actorId:owner,approved:true},agreement:{recipientId:recipient,assetId:'PIN-DEMO-01',purpose:'example-review',fields:Object.keys(c.payload),endTick:100,revoked:false,revision:1},envelope:{schemaVersion:'1.0',synthetic:true,kind:scenario==='S03'?'proof':'data',eventId:'EV-DEMO-1',operationId:'OP-DEMO-1',correlationId:'RUN-DEMO-1',origin:c.origin,destination:c.destination,tenantId:'TENANT-DEMO',actorId:owner,assetId:'PIN-DEMO-01',recipientId:recipient,purpose:'example-review',sequence:1,payloadRevision:1,agreementId:'SDA-DEMO-01',digestRef:'DIGEST-DEMO-01',payload:{...c.payload}}};
}

export const stageGuide = [
 {what:'The owner starts an exchange and selects the information to send.',goal:'Make the sender, recipient and purpose clear.'},
 {what:'Check the sender’s simulated sign-in details and whether they are still valid.',goal:'Establish who is making the request. Sign-in alone does not allow sharing.'},
 {what:'Match the Mesh account to the correct PCN party, organization and asset.',goal:'Connect the right records without mixing up organizations.'},
 {what:'Check that the message has the required information, source context and order.',goal:'Catch incomplete or out-of-order messages before they are processed.'},
 {what:'Check the owner’s sharing rules for this recipient, data, purpose and time.',goal:'Send only what the owner allows. Check again just before delivery.'},
 {what:'Compare the data with the version that was reviewed, using a simulated integrity check.',goal:'Detect changes after review. This does not prove the data is true.'},
 {what:'Send the allowed information through the proposed bridge to the receiving service.',goal:'Make one permitted delivery or record. Stop safely if the service is unavailable.'},
 {what:'Send a result or delivery acknowledgment back through the bridge.',goal:'Tell the sender what happened. A missing reply needs a status check, not a blind resend.'}
];
