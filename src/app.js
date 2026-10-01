import {compactMap} from './compact-map.js';
import {sharingParties,organizationLinks} from './parties.js';
import {exchangeView,packetPreview} from './exchange.js';
import {create,step,recover,exportTrace,evidenceBundle} from './engine.js';
import {scenarios,faults,stages,stageGuide,currentScenario,handoffs} from './fixtures.js';
import {standardsHTML} from './standards.js';
const $=s=>document.querySelector(s);let state=create(),timer=null,selectedBlock=null,motionTimer=null;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('#scenario').innerHTML=Object.entries(scenarios).map(([id,s])=>`<option value="${id}">${s.name}</option>`).join('');
$('#fault').innerHTML=faults.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');
$('#standards-content').innerHTML=standardsHTML;
$('#failure-cards').innerHTML=faults.filter(f=>f.id!=='none').map(f=>`<article class="card"><div class="eyebrow">${f.id} · INJECTED FAILURE</div><h3>${f.name}</h3><p>${f.description}</p><small>Recovery owner: ${f.role}</small><p>${f.recovery}</p><button data-fault="${f.id}">Try this failure →</button></article>`).join('');
function stop(){clearTimeout(motionTimer);document.body.dataset.moving='false';clearInterval(timer);timer=null;$('#play').textContent='▶ Play';}
function reset(note){stop();if(handoffs($('#scenario').value).length===1)$('#fault-handoff').value='0';state=create($('#scenario').value,$('#fault').value,$('#outcome').value,Number($('#fault-handoff').value));selectedBlock=null;$('#notice').textContent=note;render();}
function tab(id){document.querySelectorAll('[role=tab]').forEach(t=>{const on=t.id==='tab-'+id;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!on;});}
document.querySelectorAll('[role=tab]').forEach((t,i,all)=>{t.onclick=()=>tab(t.getAttribute('aria-controls'));t.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(i+1)%all.length;if(e.key==='ArrowLeft')next=(i+all.length-1)%all.length;if(e.key==='Home')next=0;if(e.key==='End')next=all.length-1;if(next!==undefined){e.preventDefault();all[next].focus();all[next].click();}};});
$('#scenario').onchange=()=>{if($('#scenario').value!=='S01'&&$('#fault').value==='F10')$('#fault').value='none';reset('Scenario changed. A new exercise starts with fresh synthetic state.');};
$('#fault').onchange=()=>reset('Failure changed. A new exercise starts; no previous approval is reused.');
$('#fault-handoff').onchange=()=>reset('Failure target changed. A new exercise starts.');
$('#outcome').onchange=()=>reset('Authoritative outcome changed. A new synthetic exercise starts.');
$('#reset').onclick=()=>reset('Reset: new exercise, original fixture and selected failure restored.');
function animateExchange(){clearTimeout(motionTimer);document.body.dataset.moving=exchangeView(state).lane?'true':'false';motionTimer=setTimeout(()=>{document.body.dataset.moving='false';},2200);}
function advance(){selectedBlock=null;step(state);render();if(!['ready','running','pending'].includes(state.status))stop();animateExchange();}
$('#step').onclick=()=>{stop();advance();};
$('#play').onclick=()=>{if(timer){stop();return;}$('#play').textContent='Ⅱ Pause';advance();if(['ready','running','pending'].includes(state.status))timer=setInterval(advance,3500);};
$('#recover').onclick=()=>{stop();recover(state,state.status==='unknown'||state.fault==='F10'?'query':state.status==='review'?'restore':'repair');render();animateExchange();};
$('#download-evidence').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(evidenceBundle(state),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`synthetic-${state.scenario}-${state.fault}-evidence.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(exportTrace(state),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`synthetic-${state.scenario}-${state.fault}-trace.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.querySelectorAll('[data-fault]').forEach(b=>b.onclick=()=>{if(b.dataset.fault==='F10')$('#scenario').value='S01';$('#fault').value=b.dataset.fault;reset('Failure loaded. Step or Play to see where the flow stops.');tab('flow');$('#fault').focus();});
const blocks={
 mesh:{title:'Hushmesh',actor:'The company sharing data and the person or company receiving it.',input:'A request to share data, or data that the owner has agreed to share.',action:'In this example, Mesh-side apps send the owner’s data or receive the shared result.',output:'The allowed data, or a reply saying it arrived. Private keys are never sent.',limit:'This demo does not connect to the real Mesh. It does not prove that the data is true.'},
 adapter:{title:'Proposed bridge',actor:'The team running the connection, the security reviewer, and the data owner.',input:'A sharing request, the sender’s account details, and the owner’s sharing rules.',action:'Match the accounts, check the message, and check permission before passing data along. Stop if a check fails.',output:'Only the data the owner allows. If something goes wrong, show the problem and wait for it to be fixed.',limit:'This bridge is a proposed design. Being signed in does not give someone permission to see another company’s data.'},
 pcn:{title:'PCN',actor:'The data owner, the team running PCN, and people allowed to approve records.',input:'A request to record information, or a request to share data under the owner’s rules.',action:'In this demo, PCN records a reference and a history of what happened. Sharing follows the owner’s rules; original files stay with the owner.',output:'A record number, allowed data, or a review result. It can also send a reply about what happened.',limit:'Saving a record or receiving a reply does not prove the information is true. The real connection still needs to be confirmed with both providers.'}
};
function inspect(name){selectedBlock=name;$('#block-details').open=true;render();}
$('#unified-diagram').addEventListener('click',e=>{const n=e.target.closest('[data-party],[data-block]');if(n)inspect(n.dataset.party??n.dataset.block);});
$('#unified-diagram').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){const n=e.target.closest('[data-party],[data-block]');if(n){e.preventDefault();inspect(n.dataset.party??n.dataset.block);}}});

function render(){
 const focused=document.activeElement?.closest?.("#unified-diagram [data-party],#unified-diagram [data-block]");
 const focusKey=focused?.dataset.party?`[data-party="${focused.dataset.party}"]`:focused?.dataset.block?`[data-block="${focused.dataset.block}"]`:null;
 const s=state,c=currentScenario(s),f=faults.find(f=>f.id===s.fault),blocked=!['ready','running','pending'].includes(s.status);
 $('#outcome-control').hidden=s.fault!=='F10';
 $('#scenario-description').textContent=scenarios[s.scenario].description;
 $('#handoff-controls').hidden=handoffs(s.scenario).length===1;
 $('#handoff-plan').hidden=handoffs(s.scenario).length===1;
 $('#handoff-list').innerHTML=handoffs(s.scenario).map((h,i)=>`<li ${i===s.legIndex?'aria-current=step':''}><strong>${i+1}. ${escape(h.name)}</strong><span>${i<s.legIndex||s.status==='complete'?'Completed':i===s.legIndex?'Current handoff':'Next · separate permission required'}</span></li>`).join('');$('#fault option[value=F10]').disabled=s.scenario!=='S01';
 $('#state-badge').dataset.state=s.status;
 $('#state-badge').textContent=({ready:'Ready',running:'In progress',pending:'Pending',review:'Operator review',denied:'⊘ Denied',quarantined:'⊘ Quarantined',unknown:'? Outcome unknown',complete:'✓ Complete'})[s.status];
 $('#step-label').textContent=`HANDOFF ${s.legIndex+1}/${handoffs(s.scenario).length} · STEP ${Math.min(s.trace.length? s.lastStage+1:0,8)} / 8 · ${s.operationId}`;
 $('#current-title').textContent=s.status==='complete'?'Exchange complete':s.status==='ready'&&s.stage===0?'Ready to explore':blocked?'A boundary needs attention':stages[s.lastStage];
 $('#explanation').textContent=s.message;$('#effects').textContent=s.effects;$('#attempts').textContent=s.attempts+'/3';
 $('#step').disabled=blocked;$('#play').disabled=blocked;
 $('#payload').textContent=JSON.stringify(s.envelope.payload,null,2);
 $('#recovery').hidden=!['denied','quarantined','unknown','review'].includes(s.status);
 $('#recovery-text').textContent=f.role+': '+(s.fault==='F10'&&s.status==='review'?'The authoritative result is still pending. Keep resend disabled. Reset with a resolved fixture to explore a different outcome.':f.recovery);
 $('#recover').textContent=s.fault==='F10'?'Query existing operation':s.status==='review'?'Restore boundary & recheck':'Apply reviewed recovery';
 const exchange=exchangeView(s);
 $('#unified-diagram').innerHTML=compactMap(s);
 const preview=packetPreview(s);
 $('#packet-caption').textContent=preview.label;
 $('#proposed-packet').textContent=JSON.stringify(preview.packet,null,2);
 for(const [id,key] of [['exchange-phase','phase'],['exchange-from','from'],['exchange-to','to'],['exchange-message','message'],['exchange-mechanism','mechanism'],['party-name','person'],['party-action','action'],['owner-description','owner'],['recipient-description','recipient']])$('#'+id).textContent=exchange[key];
 $('#wire-arrow').textContent=exchange.lane?'→ → →':'•';
 document.querySelectorAll('[data-lane]').forEach(p=>p.classList.toggle('lane-active',p.dataset.lane===exchange.lane));
 const active=selectedBlock??(s.active==='adapter'?'adapter':s.active==='source'?c.origin:c.destination);
 document.querySelectorAll('[data-block]').forEach(b=>{b.classList.toggle('active',b.dataset.block===active);b.classList.toggle('blocked',blocked&&s.status!=='complete'&&b.dataset.block===active);});
 const org=sharingParties(s).find(p=>p.id===active);
 const b=org?{title:org.name,actor:org.organizationType, input:org.role,action:org.permission,output:org.state,limit:org.dataLocation+' Network membership alone grants no permission.'}:blocks[active];$('#block-copy').innerHTML=`<h4>${b.title}</h4><p><strong>Who uses it:</strong> ${b.actor}</p><p><strong>What goes in:</strong> ${b.input}</p><p><strong>What it does:</strong> ${b.action}</p><p><strong>What comes out:</strong> ${b.output}</p><p><strong>What this does not prove:</strong> ${b.limit}</p>`;
 $('#stages').innerHTML=stages.map((name,i)=>`<li class="${i<s.lastStage||s.status==='complete'?'done':''}" ${i===s.lastStage?'aria-current="step"':''}><b>${i<s.lastStage||s.status==='complete'?'✓':i+1}</b>${name}</li>`).join('');
 const finished=['complete','denied','quarantined','review','unknown'].includes(s.status);
 $('#download-evidence').disabled=!finished;
 $('#evidence-summary').textContent=({S01:'Registration example: information about Aster’s data, a simulated PCN record ID (PIN), check results and the reply. Original evidence stays with Aster.',S02:'Disclosure example: the two permitted fields, recipient reference, gate decisions and delivery acknowledgment.',S03:'Proof-only example: evaluator, standard reference and evaluation result. Underlying source evidence is excluded.'})[s.scenario]??'Multi-party evidence: separate packets and receipts for each handoff, with the owner, recipient and permission checked each time.';
 $('#evidence-label').textContent=finished?'Actual synthetic result of this run. Failed gates do not add denied data.':'Illustrative structure only — run the scenario to generate downloadable evidence.';
 $('#evidence-json').textContent=JSON.stringify(finished?evidenceBundle(s):{synthetic:true,exampleOnly:true,scenario:s.scenario,possiblePermittedRepresentation:c.payload,possibleReceipt:{outcome:'received',resultRef:'RESULT-DEMO'},note:'Examples are not evidence of delivery. Actual output depends on the run and injected failure.'},null,2);
 $('#stage-guide').innerHTML=stageGuide.map((item,i)=>{const current=s.trace.length>0&&i===s.lastStage;return `<article class="stage-guide-card ${current?'current-stage':''}" ${current?'aria-current="step"':''}><h4><span>${i+1}</span> ${stages[i]}${current?`<small>${s.status==='complete'?'Finished here':blocked?'Stopped here':'Current stage'}</small>`:''}</h4><p>${escape(item.what)}</p><p><strong>Objective:</strong> ${escape(item.goal)}</p></article>`;}).join('');
 $('#trace-empty').hidden=!!s.trace.length;
 $('#trace').innerHTML=s.trace.map(t=>`<li><span class="trace-tick">${String(t.tick).padStart(2,'0')}</span><div class="${t.from==='mesh'?'mesh':'pcn'}">${t.kind==='check'?'Gate check':t.from+' → '+t.to}<small>${escape(t.state)} · ${escape(t.kind)}</small></div><div>${escape(t.explanation)}<small>Handoff ${t.handoff??1} · ${escape(t.actor)} · ${escape(t.operationId)} · ${escape(t.correlationId)}</small></div></li>`).join('');
 $('#trace').scrollTop=$('#trace').scrollHeight;
 if(focusKey){const scope=window.innerWidth<=740?'.compact-mobile':'.compact-map';$('#unified-diagram '+scope+' '+focusKey)?.focus({preventScroll:true});}
}
render();
