import {currentScenario,handoffs} from './fixtures.js';
// Fictional organization memberships for this exercise, not real network registrations.
export const organizations = [
 {id:'OWNER-DEMO',entityType:'data-sharing-organization',name:'Aster Components',fictional:true,organizationType:'Manufacturer',connections:['mesh','pcn'],dataLocation:'Original files stay in Aster’s owner-controlled storage.'},
 {id:'RECIPIENT-DEMO',entityType:'data-sharing-organization',name:'Northstar Review',fictional:true,organizationType:'Outside reviewer',connections:['mesh'],dataLocation:'Northstar keeps its own review decisions. It receives allowed copies or results, not another owner’s original evidence.'}
 ,{id:'OSAT-DEMO',entityType:'data-sharing-organization',name:'Harbor Assembly & Test',fictional:true,organizationType:'OSAT — outsourced chip assembly and testing',connections:['pcn'],dataLocation:'Harbor keeps original manufacturing and test evidence in its own storage.'}
];
export function organizationName(id){return organizations.find(o=>o.id===id)?.name??id;}
export function sharingParties(s){
 if(handoffs(s.scenario).length>1){
 const c=currentScenario(s),blocked=['denied','quarantined','pending','review','unknown'].includes(s.status);
 return organizations.map(org=>({...org,connections:[...org.connections],role:org.id===c.ownerId?'Data owner and sender for this handoff':org.id===c.recipientId?'Recipient for this handoff':'Not taking part in this handoff',permission:org.id===c.ownerId?'Authorizes this packet only. The next handoff needs its own permission.':org.id===c.recipientId?'May receive only: '+Object.keys(c.payload).join(', ')+'.':'No access granted by this handoff.',state:org.id===c.recipientId?(s.deliveries.some(d=>d.operationId===s.operationId)?'Allowed representation received':blocked?'No data received':'Waiting for allowed data'):org.id===c.ownerId?(blocked?'Sharing needs attention':'Owns and authorizes this packet'):'Not involved in current handoff',active:org.id===(s.lastStage<6?c.ownerId:c.recipientId)}));
 }

 const registering=s.scenario==='S01',delivered=s.deliveries.length>0,blocked=['denied','quarantined','pending','review','unknown'].includes(s.status);
 return organizations.map(org=>org.id==='OSAT-DEMO'?{...org,role:'Not taking part in this exchange',permission:'No access granted in this scenario.',state:'Not involved',active:false}:({...org,connections:[...org.connections],
  role:org.id==='OWNER-DEMO'?'Data owner and sender':registering?'Not taking part in this exchange':'Named recipient and reviewer',
  permission:org.id==='OWNER-DEMO'?'Chooses the data and who may receive it.':registering?'No data is being shared with Northstar in this scenario.':s.scenario==='S03'?'May receive evaluator, standard and review result only.':'May receive temperature and test result only.',
  state:org.id==='OWNER-DEMO'?(blocked?'Sharing needs attention':s.status==='complete'?'Exchange finished':'Owns and authorizes the data'):registering?'Not a recipient':delivered?'Allowed representation received':blocked?'No data received':'Waiting for allowed data',
  active:org.id==='OWNER-DEMO'?(s.lastStage<6||registering):!registering&&s.lastStage>=6&&!blocked
 }));
}

// Only declared memberships get a link; direction describes this step, not access rights.
export function organizationLinks(s){
 const c=currentScenario(s),owner=c.ownerId??'OWNER-DEMO',recipient=c.recipientId??(s.scenario==='S01'?null:'RECIPIENT-DEMO');
 const stopped=['denied','quarantined','pending','review','unknown'].includes(s.status);
 return organizations.flatMap(org=>org.connections.map(service=>{
 let direction=null;
 if(s.trace.length&&!stopped){
  if(s.lastStage===0&&org.id===owner&&service===c.origin)direction='to-service';
  if(s.lastStage===6&&org.id===recipient&&service===c.destination)direction='from-service';
  if(s.lastStage===7){
   if(org.id===recipient&&service===c.destination)direction='to-service';
   if(org.id===owner&&service===c.origin)direction='from-service';
  }
 }
 return {id:org.id+'-'+service,organization:org.name,service,direction,label:direction==='to-service'?(s.lastStage===7?'Sends receipt':'Sends request'):direction==='from-service'?(s.lastStage===7?'Receives receipt':'Receives allowed data'):'Connected · no transfer this step'};
 }));
}
