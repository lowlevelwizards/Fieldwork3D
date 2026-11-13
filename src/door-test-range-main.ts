/** D0 Door Test Range: real tactical Session and the actual motor.
 * Unlike the older simplified Physicality Lab, no proxy collision engine.
 * Debug hinge buttons intentionally manipulate ONLY this isolated lab map.
 */
import {activateSite,doorLeafSegment,doorCenter,
 type Pt} from './breach-core.ts';
import {pushDoor} from './breach-door.ts';
import {DOOR_RANGE_CASES,doorRangeSite,prepareDoorRangeCase,
 type DoorRangeCaseId} from './breach-door-test-cases.ts';
import {newSession,team,planSquadEntry,planMove,clearPlan,
 toggling,stepSession,type Session} from './breach-game.ts';

const get=<T extends HTMLElement>(id:string)=>
 document.getElementById(id) as T;
const stage=get<HTMLCanvasElement>('doorStage');
const ctx=stage.getContext('2d')!;
const scenario=get<HTMLSelectElement>('scenario');
const program=get<HTMLSelectElement>('program');
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
   p(300+(i-2)*18,174):p(293+i*12,346+i*6);
  ok=planMove(s,a.id,goal)&&ok;
 }
 return ok;
}
function reset(){
 playing=false;acc=0;flips=0;minSpacing=Infinity;
 passed=new Set();crossedAt=new Map();
 s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite(scenario.value as DoorRangeCaseId),
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
 outcome.textContent=passed.size+' / '+activeIds.size+' crossed · '+
  completed+' finished';
 flipsView.textContent=String(flips);
 const deg=((door.openFraction??0)*1.54*180/Math.PI).toFixed(0);
 doorInfo.textContent=deg+'° · '+(door.open?'OPEN':'CLOSED')+
  (door.locked?' · LOCKED':'')+(door.wedged?' · WEDGED':'');
 detail.textContent=members.map(a=>{
  const episode=a.doorTraversal;
  return a.name+' · '+(episode?episode.phase.toUpperCase()+
    ' / '+episode.maneuver.toUpperCase()+' · attempts '+episode.maneuverAttempts:
    'NO EPISODE')+
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
 paint();
 if(team(s).slice(0,4).filter(a=>activeIds.has(a.id))
  .every(a=>!a.plan.length)){
  playing=false;go.textContent='GO';
 }
}
function toggle(){
 if(s.phase==='planning')toggling(s);
 else if(s.phase==='running')toggling(s);
 playing=s.phase==='running';
 go.textContent=playing?'PAUSE':'GO';
 paint();
}
function report(){
 const door=s.doors[0];
 return {scenario:scenario.value,protocol:program.value,
  phase:s.phase,time:s.seconds,planned,flips,
  minOperatorSpacing:Number.isFinite(minSpacing)?minSpacing:null,
  crossed:[...crossedAt.entries()],
  door:{open:door.open,openFraction:door.openFraction,
   hinge:door.hinge,swing:door.swing,locked:door.locked,wedged:door.wedged,
   angularVelocity:door.angularVelocity,pushTarget:door.pushTarget},
  operators:team(s).slice(0,4).map(a=>({
   id:a.id,p:a.p,remainingOrders:a.plan.length,
   blockedTime:a.blockedTime,pause:a.motorPause,
   episode:a.doorTraversal,nav:a.nav.slice(0,8)
  })),events:[...s.events]};
}
get<HTMLButtonElement>('reset').addEventListener('click',reset);
go.addEventListener('click',toggle);
get<HTMLButtonElement>('step').addEventListener('click',()=>{
 if(s.phase==='planning')toggling(s);
 playing=false;go.textContent='GO';tick();
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
for(const input of [scenario,program])input.addEventListener('change',reset);
let last=0,acc=0;
function frame(now:number){
 if(playing&&s.phase==='running'){
  acc+=Math.min(.12,(now-last)/1000||0)*Number(speed.value);
  let steps=0;
  while(acc>=1/60&&steps<8&&playing){
   tick();acc-=1/60;steps++;
  }
 }
 last=now;requestAnimationFrame(frame);
}
window.addEventListener('pagehide',()=>activateSite(null));
reset();requestAnimationFrame(frame);
