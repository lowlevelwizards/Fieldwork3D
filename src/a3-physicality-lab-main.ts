/** A3.0 actual-session inspector. Isolation boundary: this page is the
 * ONLY consumer of a3-physicality-*; nothing modifies live Breach behavior.
 */
import {A3_SCENES,DEFAULT_A3_CONFIG,createA3Session,
 type A3Config,type A3Scene,type A3Weapon,type A3Intent}
 from './a3-physicality-scenarios.ts';
import {probeA3,type A3Probe} from './a3-physicality-probe.ts';
import {stepSession,team,type Session} from './breach-game.ts';
import {doorLeafSegment} from './breach-core.ts';
import {createOperatorRig,poseOperator,type OperatorRig}
 from './breach-operator-rig.ts';
import {inspectOperatorPoseOutput} from './breach-operator-pose-output.ts';

const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=el<HTMLCanvasElement>('stage'),ctx=canvas.getContext('2d')!;
const configInputs=['scenario','operators','posture','intent','weapon','bearingDeg','seed'] as const;
const select=el<HTMLSelectElement>('scenario');
for(const scene of A3_SCENES){
 const option=document.createElement('option');option.value=scene.id;
 option.textContent=scene.label;select.append(option);
}
let config:A3Config={...DEFAULT_A3_CONFIG};
let s:Session,rig:OperatorRig,probe:A3Probe;
let tickIndex=0,running=false,lastFrame=0,accumulator=0;
let probeMs=0,stepMs=0,poseMs=0,measurements=0,maxProbeMs=0;
const timestamp=()=>performance.now();
function currentConfig():A3Config{
 const raw=Number(el<HTMLInputElement>('seed').value);
 return {
  scenario:select.value as A3Scene,
  seed:Number.isFinite(raw)?Math.trunc(raw):DEFAULT_A3_CONFIG.seed,
  operators:Number(el<HTMLSelectElement>('operators').value) as 1|2|3|4,
  posture:el<HTMLSelectElement>('posture').value as 'stand'|'crouch',
  intent:el<HTMLSelectElement>('intent').value as A3Intent,
  weapon:el<HTMLSelectElement>('weapon').value as A3Weapon,
  bearingDeg:Number(el<HTMLSelectElement>('bearingDeg').value)
 };
}
function status(t:string){el<HTMLElement>('message').textContent=t;}
function reset(){
 running=false;el<HTMLButtonElement>('run').textContent='RUN';
 rig?.dispose();config=currentConfig();
 s=createA3Session(config);
 rig=createOperatorRig('a3-inspector','blue');
 tickIndex=0;accumulator=0;lastFrame=0;
 probeMs=0;stepMs=0;poseMs=0;measurements=0;maxProbeMs=0;
 sample();status('Seed '+config.seed+' / tick 0 / real Breach session; paused');
}
function sample(){
 const start=timestamp();
 probe=probeA3(s,config);
 const duration=timestamp()-start;
 probeMs+=duration;maxProbeMs=Math.max(maxProbeMs,duration);
 const actor=team(s)[0];
 const poseStart=timestamp();
 poseOperator(rig,{
  x:actor.p.x,z:actor.p.y,heading:actor.heading,
  shoulderOffset:actor.aimSideOffset??0,shotHeading:actor.weaponYaw,
  travelYaw:actor.heading,velocity:actor.velocity,
  seconds:s.seconds,stride:actor.stride,posture:actor.posture,
  injury:actor.injuryStage,weapon:actor.weapon,
  reload:actor.reload,reloadDuration:1.8,
  lastThrowAt:actor.lastThrowAt,lastDoorAt:actor.lastDoorAt,
  doorMethod:actor.lastDoorMethod,doorPoint:undefined,
  physicalContact:actor.physicalContact,
  down:actor.health<=0,surrender:actor.surrendered,
  aiming:actor.aim>=.82,firing:false,turning:actor.turning,
  recoil:actor.recoil,aimBlend:actor.aim,poseV3Preview:true,
  deterministic:true,friendlyNear:probe.carry.friendlyAhead,
  friendlyAhead:probe.carry.friendlyAhead,
  obstruction:probe.presentation.blocked,
  clearanceBlocked:probe.presentation.blocked,
  weaponConfiguration:actor.weaponConfiguration,equipment:actor.equipment
 },0);
 poseMs+=timestamp()-poseStart;measurements++;
 draw();
}
function tick(){
 const start=timestamp();
 stepSession(s,1/60);tickIndex++;
 stepMs+=timestamp()-start;sample();
}
function line(x:number,y:number,x2:number,y2:number,color:string,width=2,dash=false){
 ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;
 if(dash)ctx.setLineDash([4,5]);ctx.beginPath();
 ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
}
function circle(x:number,y:number,r:number,color:string,stroke?:string){
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
 if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke();}
}
function draw(){
 ctx.fillStyle='#2e483d';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let x=20;x<=480;x+=20)line(x,20,x,420,'#365547',.55);
 for(let y=20;y<=420;y+=20)line(20,y,480,y,'#365547',.55);
 for(const o of s.site?.cover??[]){
  ctx.fillStyle='#887b65';ctx.fillRect(o.x-o.w/2,o.y-o.h/2,o.w,o.h);
  ctx.strokeStyle='#cab58b';ctx.lineWidth=1.5;
  ctx.strokeRect(o.x-o.w/2,o.y-o.h/2,o.w,o.h);
 }
 for(const w of s.site?.walls??[])line(w.a.x,w.a.y,w.b.x,w.b.y,'#dfdecb',7);
 for(const d of s.doors){
  line(d.a.x,d.a.y,d.b.x,d.b.y,'#857764',2,true);
  const leaf=doorLeafSegment(d);
  line(leaf.a.x,leaf.a.y,leaf.b.x,leaf.b.y,'#d9b477',5);
 }
 // A3.1 retains original planar 10.5-unit disks as comparison overlays.
 // Actual fire permission uses the separate height-aware body volumes.
 for(const ally of probe.allies){
  circle(ally.position.x,ally.position.y,probe.friendlyPlanarRadius,
   'rgba(244,129,111,.2)','#e98e7d');
  circle(ally.position.x,ally.position.y,7,'#8ed0bf','#17362f');
  ctx.fillStyle='#dfd4bd';ctx.font='9px ui-monospace,monospace';
  ctx.fillText('H'+ally.protectedTop,ally.position.x+13,ally.position.y-12);
  line(ally.position.x,ally.position.y,
    ally.position.x+Math.cos(ally.heading)*14,
    ally.position.y+Math.sin(ally.heading)*14,'#e4f0df',1.5);
  ctx.fillStyle='#e7e5d6';ctx.font='10px ui-monospace,monospace';
  ctx.fillText(ally.id.slice(-6),ally.position.x-17,ally.position.y-17);
  ctx.fillStyle='#e7bb91';ctx.fillText(ally.posture==='crouch'?'C':'S',
   ally.position.x+10,ally.position.y+13);
 }
 // True world-space hand anchor and normal from the fixed-step session.
 // Drawing these never grants a new gameplay contact.
 for(const anchor of probe.contactAnchors){
  const pt=anchor.point;
  const c=anchor.kind==='teammate'?'#7adbc3':
    anchor.kind==='brace'?'#e6bc80':'#dcb9ee';
  circle(pt.x,pt.z,4,c,'#24352c');
  line(pt.x,pt.z,pt.x+anchor.normal.x*8,
   pt.z+anchor.normal.z*8,c,1.4);
  ctx.fillStyle=c;ctx.font='9px ui-monospace,monospace';
  ctx.fillText(anchor.kind.toUpperCase(),pt.x+6,pt.z-7);
 }
 const a=probe.shooter,t=probe.target,shot=probe.shot;
 line(shot.origin.x,shot.origin.y,shot.destination.x,shot.destination.y,
  shot.lane==='clear'?'#bce6c5':'#f3a494',2.5,true);
 const step=probe.legacyRecovery.candidate;
 if(step)line(a.position.x,a.position.y,step.x,step.y,'#e5ad5e',2,true);
 circle(a.position.x,a.position.y,10,'#dfbb80','#faf1dc');
 line(a.position.x,a.position.y,
  a.position.x+Math.cos(a.weaponYaw)*19,
  a.position.y+Math.sin(a.weaponYaw)*19,'#f4ebc8',2.3);
 circle(shot.origin.x,shot.origin.y,3.5,'#fbf6e6','#514936');
 circle(t.position.x,t.position.y,10,'#df9784','#5d3029');
 ctx.fillStyle='#f0e7d4';ctx.font='bold 11px ui-monospace,monospace';
 ctx.fillText('SHOOTER',a.position.x-22,a.position.y-19);
 ctx.fillText('TARGET',t.position.x-20,t.position.y-18);
 if(step){circle(step.x,step.y,4,'#e9ae60');}
 el<HTMLElement>('lane').textContent=shot.lane.toUpperCase();
 el<HTMLElement>('legacyLane').textContent=shot.legacyPlanarLane.toUpperCase();
 el<HTMLElement>('heightDelta').textContent=shot.changedByHeight?'DIFFERENT':'SAME';
 el<HTMLElement>('block').textContent=shot.hardBlocked?
  shot.weaponBlocker.toUpperCase():'CLEAR';
 el<HTMLElement>('handling').textContent=probe.carry.handling.toUpperCase();
 el<HTMLElement>('shoulder').textContent=probe.shooter.shoulderOffset.toFixed(1)+
  ' / '+probe.shooter.shoulderTarget.toFixed(1);
 el<HTMLElement>('autoStance').textContent=probe.shooter.autoCrouchUntil>s.seconds?
  'AUTO CROUCH':'ORDINARY';
 el<HTMLElement>('clock').textContent=s.seconds.toFixed(3)+'s';
 el<HTMLElement>('candidate').textContent=step?
  (step.x-a.position.x).toFixed(0)+','+(step.y-a.position.y).toFixed(0):'NONE';
 el<HTMLElement>('checks').textContent=String(probe.legacyRecovery.checks);
 el<HTMLElement>('contact').textContent=probe.contactAnchors.length?
  probe.contactAnchors.map(c=>c.kind.toUpperCase()+
   ' '+c.operatorId+'→'+c.targetId+
   (c.attached?' ACTIVE':' RELEASE')).join(' / '):'NO ANCHOR';
 const poseOut=inspectOperatorPoseOutput(rig);
 const feet=rig.footsteps.feet.map((f,i)=>({
  foot:i,phase:f.phase,contact:f.contact,
  anchor:{x:Number(f.plantedAt.x.toFixed(2)),y:Number(f.plantedAt.y.toFixed(2))}
 }));
 el<HTMLElement>('details').textContent=JSON.stringify({
  tick:tickIndex,actualShot:probe.shot,
  bodyVolumes:probe.friendlyVolumes,
  visualMuzzle:probe.presentation,carry:probe.carry,
  recovery:probe.legacyRecovery,doorContacts:probe.doorContacts,
  contactAnchors:probe.contactAnchors,
  operator:probe.shooter,allies:probe.allies
 },null,2);
 el<HTMLElement>('pose').textContent=JSON.stringify({
  poseTime:poseOut?.time??null,complete:poseOut?.valid??false,
  generation:poseOut?.generation??0,slots:poseOut?.slotCount??0,
  stockError:rig.stockError,gripError:rig.gripError,eyeError:rig.eyeError,
  footScheduler:'rig-only (not firing authority)',feet
 },null,2);
 el<HTMLElement>('perf').textContent=JSON.stringify({
  sampleCount:measurements,meanProbeMs:probeMs/Math.max(1,measurements),
  maxProbeMs,meanPoseMs:poseMs/Math.max(1,measurements),
  meanStepSessionMs:stepMs/Math.max(1,tickIndex),
  note:'Wall-time measurements excluded from deterministic JSON state.'
 },null,2);
}
function report(){
 return {kind:'fieldwork-a3-0-baseline',config:{...config},tick:tickIndex,
  deltaSeconds:1/60,sample:probe,
  posePreview:{time:inspectOperatorPoseOutput(rig)?.time??null,
   valid:inspectOperatorPoseOutput(rig)?.valid??false,
   footPhases:rig.footsteps.feet.map(f=>f.phase)},
  timing:{samples:measurements,meanProbeMs:probeMs/Math.max(1,measurements),
   maxProbeMs,meanStepSessionMs:stepMs/Math.max(1,tickIndex),
   meanPoseMs:poseMs/Math.max(1,measurements)}
 };
}
function loop(now:number){
 if(running){
  accumulator+=Math.min(.1,Math.max(0,(now-(lastFrame||now))/1000));
  let steps=0;
  while(accumulator>=1/60&&steps<8){
   tick();accumulator-=1/60;steps++;
  }
 }
 lastFrame=now;requestAnimationFrame(loop);
}
el<HTMLButtonElement>('run').addEventListener('click',()=>{
 running=!running;
 el<HTMLButtonElement>('run').textContent=running?'PAUSE':'RUN';
 status(running?'Real 60 Hz tactical simulation running':'Simulation paused at tick '+tickIndex);
});
el<HTMLButtonElement>('step').addEventListener('click',()=>{
 running=false;el<HTMLButtonElement>('run').textContent='RUN';
 tick();status('Single authoritative tick '+tickIndex);
});
el<HTMLButtonElement>('reset').addEventListener('click',reset);
el<HTMLButtonElement>('copy').addEventListener('click',()=>{
 const value=JSON.stringify(report(),null,2);
 void navigator.clipboard.writeText(value).then(()=>status('Copied A3.0 snapshot'))
 .catch(()=>status('Clipboard not available; use SAVE JSON'));
});
el<HTMLButtonElement>('download').addEventListener('click',()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],
  {type:'application/json'}));
 const anchor=document.createElement('a');anchor.href=url;
 anchor.download='fieldwork-a3-0-'+config.scenario+'-seed-'+config.seed+'-tick-'+tickIndex+'.json';
 document.body.append(anchor);anchor.click();anchor.remove();
 URL.revokeObjectURL(url);status('A3.0 JSON report saved');
});
for(const id of configInputs)
 el<HTMLElement>(id).addEventListener('change',reset);
for(const id of configInputs)if(id==='seed')el<HTMLElement>(id).addEventListener('keydown',e=>{
 if((e as KeyboardEvent).key==='Enter')reset();
});
for(const [id,value] of Object.entries(DEFAULT_A3_CONFIG))
 el<HTMLInputElement|HTMLSelectElement>(id).value=String(value);
reset();requestAnimationFrame(loop);
