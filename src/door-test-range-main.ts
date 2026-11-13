/** D0 Door Test Range: real tactical Session and the actual motor.
 * Unlike the older simplified Physicality Lab, no proxy collision engine.
 * Debug hinge buttons intentionally manipulate ONLY this isolated lab map.
 */
import {activateSite,doorLeafSegment,doorCenter,
 type Pt} from './breach-core.ts';
import {pushDoor} from './breach-door.ts';
import {DoorRangeMobileProfile} from './door-range-mobile-profile.ts';
import {QueueMotionAudit,listenQueueMotion} from './breach-queue-trace.ts';
import {planDoorSchedule} from './breach-passage-plan.ts';
import {legalMoveRoute} from './breach-known-route-authoring.ts';
import {doorHandPoint} from './breach-door-hand-contact.ts';
import {DOOR_RANGE_CASES,DOOR_RANGE_APPROACHES,doorRangeSite,
 doorRangeApproachSpawn,prepareDoorRangeCase,
 type DoorRangeCaseId,type DoorRangeApproachId}
 from './breach-door-test-cases.ts';
import {Q5_HINGE_CASES,runDoorRangeQ5,summarizeQ5,
 type Q5BenchmarkResult,type Q5Program} from './door-range-q5-benchmark.ts';
import {newSession,team,planSquadEntry,planMove,clearPlan,
 toggling,stepSession,type Session} from './breach-game.ts';

const get=<T extends HTMLElement>(id:string)=>
 document.getElementById(id) as T;
const stage=get<HTMLCanvasElement>('doorStage');
const ctx=stage.getContext('2d')!;
const scenario=get<HTMLSelectElement>('scenario');
const program=get<HTMLSelectElement>('program');
const approach=get<HTMLSelectElement>('approach');
const matrixReport=get<HTMLElement>('matrixReport');
const matrixButton=get<HTMLButtonElement>('runMatrix');
const extendedMatrixButton=get<HTMLButtonElement>('runExtended');
const cancelMatrixButton=get<HTMLButtonElement>('cancelMatrix');
let matrixRows:Q5BenchmarkResult[]=[];
let matrixRunning=false,matrixAbort=false;
const speed=get<HTMLSelectElement>('speed');
const selected=get<HTMLSelectElement>('operator');
const message=get<HTMLElement>('message');
const detail=get<HTMLElement>('detail');
const doorInfo=get<HTMLElement>('doorInfo');
const outcome=get<HTMLElement>('outcome');
const clock=get<HTMLElement>('clock');
const flipsView=get<HTMLElement>('flips');
const go=get<HTMLButtonElement>('go');
const trace=get<HTMLInputElement>('trace');
const queueTraceToggle=get<HTMLInputElement>('queueTrace');
const queueTraceInfo=get<HTMLElement>('queueTraceInfo');
let queueAudit:QueueMotionAudit|null=null;
let queueSlots:ReturnType<typeof planDoorSchedule>|null=null;
const profileToggle=get<HTMLInputElement>('mobileProfile');
const profileCanvas=get<HTMLCanvasElement>('mobileChart');
const profileInfo=get<HTMLElement>('mobileStats');
let profile:DoorRangeMobileProfile|null=null;
let lastProfileDraw=0;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const p=(x:number,y:number):Pt=>({x,y});
const drawLine=(a:Pt,b:Pt,color:string,width=2)=>{
 ctx.strokeStyle=color;ctx.lineWidth=width;
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
};
for(const c of DOOR_RANGE_CASES){
 const option=document.createElement('option');
 option.value=c.id;option.textContent=c.label;scenario.append(option);
}
scenario.value='outward-left';
for(const entry of DOOR_RANGE_APPROACHES){
 const option=document.createElement('option');
 option.value=entry.id;option.textContent=entry.label;approach.append(option);
}
approach.value='straight';
let s:Session;
let planned=false,playing=false,flips=0,lastOpen=false;
let minSpacing=Infinity;
let passed=new Set<string>();
let crossedAt=new Map<string,number>();
let sourceSide=new Map<string,number>();
let activeIds=new Set<string>();
let selectedId='';
function plan(){
 const members=team(s).slice(0,4);
 if(program.value==='squad'){
  return planSquadEntry(s,'ENTRY');
 }
 const active=program.value==='solo'?members.slice(0,1):members;
 if(program.value==='counterflow'){
  // Two real teammates on each side, retaining ordinary plan authority.
  members[2].p=p(300,340);members[2].priorP={...members[2].p};
  members[3].p=p(326,370);members[3].priorP={...members[3].p};
 }
 let ok=true;
 for(let i=0;i<active.length;i++){
  const a=active[i];
  const goal=program.value==='counterflow'&&i>=2?
   p(300+(i-2)*18,174):p(282+i*23,346+(i%2)*18);
  ok=planMove(s,a.id,goal)&&ok;
 }
 return ok;
}
function reset(){
 if(s)listenQueueMotion(s,null);
 queueAudit?.reset();queueSlots=null;
 profile?.reset();lastProfileDraw=0;
 playing=false;acc=0;flips=0;minSpacing=Infinity;
 passed=new Set();crossedAt=new Map();
 s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite(scenario.value as DoorRangeCaseId,
   approach.value as DoorRangeApproachId),
  {enableCivilians:false});
 prepareDoorRangeCase(s,scenario.value as DoorRangeCaseId);
 selectedId=team(s)[0]?.id??'';
 const members=team(s).slice(0,4);
 selected.replaceChildren();
 for(const a of members){
  const option=document.createElement('option');
  option.value=a.id;option.textContent=a.name;selected.append(option);
 }
 selected.value=selectedId;
 planned=plan();
 if(queueAudit)listenQueueMotion(s,e=>queueAudit?.event(e));
 sourceSide=new Map(members.map(a=>[a.id,Math.sign(a.p.y-260)]));
 activeIds=new Set(members.filter(a=>a.plan.length>0).map(a=>a.id));
 lastOpen=s.doors[0]?.open??false;
 message.textContent=planned?
  'Plan accepted. Start, step, or tap the map to append a selected operator waypoint.':
  'Plan rejected by the actual rules. Try individual MOVE or change the scenario.';
 go.textContent='GO';paint();
}
function stats(){
 const members=team(s).slice(0,4),door=s.doors[0];
 let completed=0;
 for(const a of members){
  const original=sourceSide.get(a.id)??-1;
  const now=Math.sign(a.p.y-260);
  if(activeIds.has(a.id)&&now!==original&&Math.abs(a.p.y-260)>18&&
     !crossedAt.has(a.id))crossedAt.set(a.id,s.seconds);
  if(crossedAt.has(a.id))passed.add(a.id);
  if(activeIds.has(a.id)&&!a.plan.length)completed++;
 }
 if(door&&door.open!==lastOpen){flips++;lastOpen=door.open;}
 for(let i=0;i<members.length;i++)
  for(let j=i+1;j<members.length;j++)
   minSpacing=Math.min(minSpacing,distance(members[i].p,members[j].p));
 clock.textContent=s.seconds.toFixed(2)+'s';
 const times=[...crossedAt.values()].sort((a,b)=>a-b);
 outcome.textContent=passed.size+' / '+activeIds.size+' crossed · '+
  completed+' finished'+(times.length===4?
  ' · 4th '+times[3].toFixed(2)+'s':'');
 flipsView.textContent=String(flips);
 const deg=((door.openFraction??0)*1.54*180/Math.PI).toFixed(0);
 doorInfo.textContent=deg+'° · '+(door.open?'OPEN':'CLOSED')+
  (door.locked?' · LOCKED':'')+(door.wedged?' · WEDGED':'');
 detail.textContent=members.map(a=>{
  const episode=a.doorTraversal;
  return a.name+' · '+(episode?episode.phase.toUpperCase()+
    ' / '+episode.maneuver.toUpperCase()+
    (episode.handContact?' · HAND CONTACT':'')+
    ' · attempts '+episode.maneuverAttempts:
    'NO EPISODE')+
   ' · '+(a.doorHandContact?.releasedAt===null?
      'SUPPORT HAND '+a.doorHandContact.mode.toUpperCase():
      a.doorHandContact?'HAND RELEASING':'TWO-HAND WEAPON')+
   ' · '+(a.motorPause??a.lastBlocker??'CLEAR')+
   ' · blocked '+a.blockedTime.toFixed(1)+'s'+
   ' · orders '+a.plan.length;
 }).join('\n')+'\n\nEVENTS\n'+s.events.slice(-6).join('\n');
}
function paint(){
 ctx.fillStyle='#1c302c';ctx.fillRect(0,0,640,500);
 // Two simple rooms surrounding one real architectural threshold.
 ctx.fillStyle='#243c35';ctx.fillRect(50,46,540,212);
 ctx.fillStyle='#344a40';ctx.fillRect(50,264,540,194);
 ctx.strokeStyle='#40584d';ctx.lineWidth=.6;
 for(let x=50;x<=590;x+=20)drawLine(p(x,46),p(x,458),'#486055',.5);
 for(let y=46;y<=458;y+=20)drawLine(p(50,y),p(590,y),'#486055',.5);
 ctx.font='bold 12px system-ui';
 ctx.fillStyle='#8cac99';ctx.fillText('APPROACH',57,68);
 ctx.fillText('INTERIOR',57,445);
 // Q5: faint real deployment footprint for the chosen approach, including
 // where the members came from after the formation starts moving.
 ctx.save();ctx.strokeStyle='#9cbd9e';ctx.globalAlpha=.48;
 for(const start of doorRangeApproachSpawn(
   approach.value as DoorRangeApproachId)){
  ctx.beginPath();ctx.arc(start.x,start.y,10,0,2*Math.PI);
  ctx.stroke();
 }
 ctx.restore();
 for(const cover of s.site?.cover??[]){
  ctx.fillStyle='#967d62';
  ctx.fillRect(cover.x-cover.w/2,cover.y-cover.h/2,cover.w,cover.h);
  ctx.strokeStyle='#d1b18a';
  ctx.strokeRect(cover.x-cover.w/2,cover.y-cover.h/2,cover.w,cover.h);
 }
 for(const wall of s.site?.walls??[])drawLine(wall.a,wall.b,'#ede9d8',7);
 const door=s.doors[0];
 if(door){
  const center=doorCenter(door),leaf=doorLeafSegment(door);
  drawLine(door.a,door.b,'#ad9d7f',1.5);
  const hinge=door.hinge==='b'?door.b:door.a;
  ctx.beginPath();ctx.moveTo(hinge.x,hinge.y);
  for(let i=0;i<=24;i++){
   const f=(door.openFraction??0)*i/24;
   const tip=doorLeafSegment({...door,openFraction:f}).b;
   if(door.hinge==='b'){
    const alt=doorLeafSegment({...door,openFraction:f}).b;
    ctx.lineTo(alt.x,alt.y);
   }else ctx.lineTo(tip.x,tip.y);
  }
  ctx.strokeStyle='rgba(226,173,93,.22)';ctx.lineWidth=1.5;ctx.stroke();
  drawLine(leaf.a,leaf.b,'#f2c06d',5);
  ctx.fillStyle='#f2c06d';ctx.beginPath();ctx.arc(hinge.x,hinge.y,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f5d1a2';ctx.fillText('ENTRY',center.x+24,center.y-10);
 }
 for(const a of team(s).slice(0,4)){
  let from=a.p;
  ctx.setLineDash([5,5]);
  for(const n of a.plan)if(n.kind==='move'||n.kind==='door'){
   drawLine(from,n.p,'#6dafa0',1.15);from=n.p;
  }
  if(trace.checked&&a.nav.length){
   from=a.p;ctx.setLineDash([2,3]);
   for(const dest of a.nav.slice(0,6)){
    drawLine(from,dest,'#e9c58c',1);from=dest;
   }
  }
  ctx.setLineDash([]);
  // D4: show exactly the motor-authorized physical support-hand contact.
  // Unattached operators have no per-frame door geometry work.
  const grip=a.doorHandContact;
  if(grip){
   const tracked=grip.releasedAt===null?
     s.doors.find(d=>d.id===grip.doorId):undefined;
   const target=tracked?doorHandPoint(tracked,grip.fraction):grip.point;
   drawLine(a.p,target,tracked?'#ffd694':'#9b8b70',2);
   ctx.fillStyle=tracked?'#ffe0a2':'#9b8b70';
   ctx.beginPath();ctx.arc(target.x,target.y,3.5,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle=a.id===selectedId?'#f0cf8a':'#91d1bd';
  ctx.beginPath();ctx.arc(a.p.x,a.p.y,9,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#172923';ctx.lineWidth=2;ctx.stroke();
  const heading=p(a.p.x+Math.cos(a.heading)*17,
   a.p.y+Math.sin(a.heading)*17);
  drawLine(a.p,heading,'#f5f1e6',2);
  ctx.fillStyle='#e8f4e8';ctx.font='bold 10px system-ui';
  ctx.fillText(a.name,a.p.x-17,a.p.y-15);
  if(a.doorTraversal){
   ctx.fillStyle='#ecb776';ctx.font='9px monospace';
   ctx.fillText(a.doorTraversal.phase.toUpperCase(),a.p.x-22,a.p.y+25);
  }
 }
 stats();
}
function tick(){
 if(s.phase==='planning')return;
 stepSession(s,1/60);
 if(team(s).slice(0,4).filter(a=>activeIds.has(a.id))
  .every(a=>!a.plan.length)){
  playing=false;go.textContent='GO';
 }
 if(queueAudit){
  queueSlots??=planDoorSchedule(team(s),s.doors,(from,to)=>legalMoveRoute(s,from,to));
  queueAudit.sample(s,queueSlots);
 }
}
function toggle(){
 if(s.phase==='planning'){
  if(queueAudit)queueSlots=planDoorSchedule(team(s),s.doors,(from,to)=>legalMoveRoute(s,from,to));
  toggling(s);
 }
 else if(s.phase==='running')toggling(s);
 playing=s.phase==='running';
 go.textContent=playing?'PAUSE':'GO';
 paint();
}
function report(){
 const door=s.doors[0];
 return {scenario:scenario.value,approach:approach.value,
  protocol:program.value,
  phase:s.phase,time:s.seconds,planned,flips,
  minOperatorSpacing:Number.isFinite(minSpacing)?minSpacing:null,
  crossed:[...crossedAt.entries()],
  door:{open:door.open,openFraction:door.openFraction,
   hinge:door.hinge,swing:door.swing,locked:door.locked,wedged:door.wedged,
   angularVelocity:door.angularVelocity,pushTarget:door.pushTarget},
  operators:team(s).slice(0,4).map(a=>({
   id:a.id,p:a.p,remainingOrders:a.plan.length,
   blockedTime:a.blockedTime,pause:a.motorPause,
   episode:a.doorTraversal,grip:a.doorHandContact,
   nav:a.nav.slice(0,8)
  })),events:[...s.events],queueAudit:queueAudit?.report()??null,
  mobileProfile:profile?.snapshot(performance.now())??null,
  q5Matrix:matrixRows.length?{summary:summarizeQ5(matrixRows),rows:matrixRows}:null};
}
get<HTMLButtonElement>('reset').addEventListener('click',reset);
go.addEventListener('click',toggle);
get<HTMLButtonElement>('step').addEventListener('click',()=>{
 if(s.phase==='planning')toggling(s);
 playing=false;go.textContent='GO';tick();paint();
});
get<HTMLButtonElement>('open').addEventListener('click',()=>{
 const door=s.doors[0];door.open=true;door.openedAt=s.seconds;paint();
});
get<HTMLButtonElement>('push').addEventListener('click',()=>{
 const door=s.doors[0];
 const applied=pushDoor(door,2.5);
 message.textContent=applied?'Physical hinge push requested':'Push rejected by actual hinge state';
 paint();
});
get<HTMLButtonElement>('close').addEventListener('click',()=>{
 const door=s.doors[0];door.open=false;door.pushTarget=1;paint();
});
get<HTMLButtonElement>('wedge').addEventListener('click',()=>{
 const door=s.doors[0];door.wedged=!door.wedged;paint();
});
get<HTMLButtonElement>('clearSelected').addEventListener('click',()=>{
 if(s.phase!=='planning')return;
 clearPlan(s,selectedId);paint();
});
get<HTMLButtonElement>('copy').addEventListener('click',()=>{
 void navigator.clipboard.writeText(JSON.stringify(report(),null,2))
  .then(()=>{message.textContent='Copied reproducible door report';})
  .catch(()=>{message.textContent='Clipboard unavailable; inspect the live diagnostics';});
});
stage.addEventListener('pointerdown',event=>{
 if(s.phase!=='planning')return;
 const rect=stage.getBoundingClientRect();
 const at=p((event.clientX-rect.left)*stage.width/rect.width,
  (event.clientY-rect.top)*stage.height/rect.height);
 const near=team(s).find(a=>distance(a.p,at)<17);
 if(near){selectedId=near.id;selected.value=near.id;paint();return;}
 const accepted=planMove(s,selectedId,at);
 message.textContent=accepted?'Added real authored MOVE for '+selectedId:
  'Invalid destination; no order added';
 paint();
});
selected.addEventListener('change',()=>{selectedId=selected.value;paint();});
trace.addEventListener('change',paint);
for(const input of [scenario,program,approach])
 input.addEventListener('change',()=>{if(!matrixRunning)reset();});
function q5FormatRow(r:Q5BenchmarkResult){
 const time=r.lastCross===null?'—':r.lastCross.toFixed(2)+'s';
 const finish=r.finishTime===null?'—':r.finishTime.toFixed(2)+'s';
 const expected=r.outcome==='expected-blocked'||
  r.outcome==='expected-obstructed';
 const label=expected?'OBSTRUCTED (EXPECTED)':r.success?'PASS':'FAIL';
 return label+' · '+r.door+' / '+r.approach+' / '+r.program+
  ' · fourth '+time+' · finish '+finish+
  (r.success?'':' · '+r.outcome+' · '+r.crossed+'/4 crossed; '+
   r.operators.map(a=>a.id+':'+a.orders+' orders/'+(a.blocker??'clear')).join(' | '));
}
async function runQ5Matrix(extended:boolean){
 if(matrixRunning)return;
 matrixRunning=true;matrixAbort=false;
 matrixButton.disabled=true;extendedMatrixButton.disabled=true;
 cancelMatrixButton.disabled=false;
 // Isolate the batch from the visible running session. Each measurement
 // constructs an unmodified real Session and restores the visible lab.
 playing=false;
 if(s.phase==='running')toggling(s);
 go.textContent='GO';
 matrixRows=[];
 const combos:{door:DoorRangeCaseId;approach:DoorRangeApproachId;
  program:Q5Program}[]=[];
 for(const door of Q5_HINGE_CASES)
  for(const entry of DOOR_RANGE_APPROACHES)
   combos.push({door,approach:entry.id,program:'squad'});
 if(extended){
  for(const door of Q5_HINGE_CASES)
   for(const entry of DOOR_RANGE_APPROACHES)
    combos.push({door,approach:entry.id,program:'independent'});
  for(const door of ['ajar-outward','wide-open','swing-furniture',
    'near-frame','locked','wedged'] as DoorRangeCaseId[])
   for(const entry of DOOR_RANGE_APPROACHES)
    combos.push({door,approach:entry.id,program:'squad'});
 }
 try{
  for(const [i,{door,approach:formation,program:execution}] of
   combos.entries()){
   if(matrixAbort)break;
   const result=runDoorRangeQ5(door,formation,execution);
   matrixRows.push(result);
   const summary=summarizeQ5(matrixRows);
   matrixReport.textContent=
    'MATRIX '+(i+1)+' / '+combos.length+' · '+
    summary.pass+' crossed successfully · '+
    (summary.expectedBlocked+summary.expectedObstructed)+
    ' expected obstructions · '+summary.failed+' failures\n'+
    matrixRows.map(q5FormatRow).join('\n');
   // Give the user a rendered frame between real-session batches.
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  }
  const summary=summarizeQ5(matrixRows);
  matrixReport.textContent=(matrixAbort?'CANCELLED\n':'COMPLETED\n')+
   JSON.stringify(summary,null,2)+'\n\n'+
   matrixRows.map(q5FormatRow).join('\n');
 }finally{
  matrixRunning=false;matrixButton.disabled=false;
  extendedMatrixButton.disabled=false;cancelMatrixButton.disabled=true;
  reset();
 }
}
matrixButton.addEventListener('click',()=>{void runQ5Matrix(false);});
extendedMatrixButton.addEventListener('click',()=>{void runQ5Matrix(true);});
cancelMatrixButton.addEventListener('click',()=>{matrixAbort=true;});
get<HTMLButtonElement>('copyMatrix').addEventListener('click',()=>{
 if(!matrixRows.length){message.textContent='Run Q5 matrix first';return;}
 void navigator.clipboard.writeText(JSON.stringify({
   summary:summarizeQ5(matrixRows),rows:matrixRows},null,2))
  .then(()=>{message.textContent='Copied Q5 full matrix and failures';})
  .catch(()=>{message.textContent='Clipboard unavailable';});
});
function drawMobileProfile(now:number){
 if(!profile)return;
 const s=profile.snapshot(now);
 const fmt=(n:number)=>n.toFixed(1);
 profileInfo.textContent=
  'RAF worst '+fmt(s.worstRaf)+'ms · ≥33ms '+s.slow+
  ' · ≥67ms '+s.severe+' · suspensions '+s.suspensions+
  '\nSIM peak '+fmt(s.worstSim)+'ms / avg '+fmt(s.meanSim)+
  'ms · DRAW peak '+fmt(s.worstPaint)+'ms / avg '+
  fmt(s.meanPaint)+'ms · '+s.ticks+' fixed ticks / '+
  s.frames+' callbacks';
 const chart=profileCanvas.getContext('2d');
 if(!chart)return;
 const width=profileCanvas.width,height=profileCanvas.height;
 chart.clearRect(0,0,width,height);
 chart.fillStyle='#172923';chart.fillRect(0,0,width,height);
 const scale=Math.max(70,Math.min(240,Math.ceil(s.worstRaf/20)*20));
 const plot=height-22;
 for(const threshold of [16.7,33.3,67]){
  const y=plot-Math.min(threshold/scale,1)*plot;
  chart.strokeStyle='#537365';chart.lineWidth=.7;
  chart.beginPath();chart.moveTo(0,y);chart.lineTo(width,y);chart.stroke();
  chart.fillStyle='#bad0c1';chart.font='10px ui-monospace,monospace';
  chart.fillText(Math.round(threshold)+'ms',4,Math.max(10,y-3));
 }
 for(const b of s.buckets){
  const x=(b.at-(now-60000))/60000*width;
  if(x<0||x>width)continue;
  const bars=[{ms:b.worstRaf,color:'#e6be80',width:2},
   {ms:b.worstSim,color:'#70c8aa',width:1},
   {ms:b.worstPaint,color:'#d48d87',width:1}];
  for(const bar of bars){
   const h=Math.min(1,bar.ms/scale)*plot;
   chart.fillStyle=bar.color;
   chart.fillRect(x,plot-h,bar.width,h);
  }
 }
 chart.fillStyle='#b8cdbf';chart.font='11px ui-monospace,monospace';
 chart.fillText('−60 s',5,height-5);chart.fillText('NOW',width-31,height-5);
}
queueTraceToggle.addEventListener('change',()=>{
 queueAudit=queueTraceToggle.checked?new QueueMotionAudit():null;
 queueSlots=null;
 listenQueueMotion(s,queueAudit?e=>queueAudit?.event(e):null);
 queueTraceInfo.textContent=queueAudit?'Q0 attribution armed — records 10Hz position samples and actual yield sources.':'OFF';
});
profileToggle.addEventListener('change',()=>{
 profile=profileToggle.checked?new DoorRangeMobileProfile():null;
 profileCanvas.hidden=!profile;
 profileInfo.textContent=profile?
  'Recording real RAF gaps, fixed simulation and 2D drawing for 60 s.' :
  'OFF — zero profiling and graph work.';
 lastProfileDraw=0;
 if(profile)drawMobileProfile(performance.now());
});
let last=0,acc=0;
function frame(now:number){
 const gap=last?Math.max(0,now-last):0;
 const simStart=profile?performance.now():0;
 let steps=0;
 if(playing&&s.phase==='running'){
  acc+=Math.min(.12,gap/1000)*Number(speed.value);
  while(acc>=1/60&&steps<8&&playing){
   tick();acc-=1/60;steps++;
  }
 }
 const simMs=profile?performance.now()-simStart:0;
 const paintStart=profile?performance.now():0;
 // A single browser draw for all fixed simulation ticks in this RAF.
 if(steps>0)paint();
 const paintMs=profile?performance.now()-paintStart:0;
 if(queueAudit&&steps){
  const report=queueAudit.report();
  queueTraceInfo.textContent='Q0 WAIT backward '+report.waitingBackward.toFixed(2)+
   'u · '+report.waitingSamples+' held samples · sources '+JSON.stringify(report.sources);
 }
 if(profile){
  profile.add({at:now,raf:gap,sim:simMs,paint:paintMs,steps});
  if(now-lastProfileDraw>=250){
   drawMobileProfile(now);lastProfileDraw=now;
  }
 }
 last=now;requestAnimationFrame(frame);
}
window.addEventListener('pagehide',()=>activateSite(null));
reset();requestAnimationFrame(frame);
