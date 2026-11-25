import {TacticalScene3D} from './breach-3d.ts';
import {newSession,team,enemies,type ShotEvent,type Session} from './breach-game.ts';
import {activateSite,type Pt} from './breach-core.ts';
import {buildTrainingSite} from './training/training-site-builder.ts';
import {DEFAULT_TRAINING_CONFIG} from './training/training-courses.ts';
import {generateSite,type Site} from './breach-site.ts';
import {segmentAttachment,coverAttachment} from './breach-impact-surface.ts';
import {retainImpactMark} from './breach-impact-evidence-buffer.ts';
import {registerWound,stabilizeWound} from './breach-medical-wounds.ts';
import {sampleBleedingEvidence} from './breach-blood-evidence.ts';
import {advanceTransientSimulationEffects} from './breach-simulation-phases.ts';

/** Lab-only authored event fixtures, rendered by the production pipeline.
 * No campaign persistence, tactical shot authority or alternate VFX engine. */
type Sample='miss'|'hit'|'down'|'pool'|'stone'|'wood'|'metal'|'dust'|'glass'|'flash'|'muzzle'|'vegetation';
const stage=new TacticalScene3D(),legacy=newSession();
const targetTemplate=enemies(legacy)[0];
if(!targetTemplate)throw Error('Missing lab actor template');
const arena=buildTrainingSite({...DEFAULT_TRAINING_CONFIG,squadSize:1});
arena.cover.push(
 {id:'lab-wood',fixture:'crate',x:310,y:665,w:28,h:26,low:true,topHeight:20},
 {id:'lab-metal',fixture:'support-column',x:390,y:665,w:16,h:16,low:false,topHeight:40});
let exterior:Site|undefined;
let session:Session,site:Site,rook:Session['operators'][number],target:Session['operators'][number];
let mode:'arena'|'exterior'='arena',paused=false,speed=1,active:Sample='hit';
let last=performance.now(),accumulator=0;
const status=document.getElementById('status')!,metrics=document.getElementById('metrics')!;
const label=(text:string)=>{status.textContent=text;};
function build(next:'arena'|'exterior'){
 mode=next;site=next==='arena'?arena:(exterior??=generateSite(3,'standard',undefined,{mission:'intel'},{archetype:'house'}));
 activateSite(site);session=newSession(0,site.seed,'full-view','small','hold',site);
 rook=team(session)[0];target=structuredClone(targetTemplate);
 if(next==='arena'){
  rook.p={x:160,y:655};target.p={x:220,y:655};
  rook.heading=0;target.heading=Math.PI;rook.weaponYaw=0;target.weaponYaw=Math.PI;
  target.health=4;target.injuryStage=0;target.medical={wounds:[],bloodLoss:0};
  target.lastDownAt=-100;target.lastHitAt=-100;target.downedAt=null;target.deathAt=null;
  rook.priorP={...rook.p};target.priorP={...target.p};session.operators=[rook,target];
 }else session.operators=[rook];
 session.civilians=[];session.shots=[];session.impactMarks=[];session.seconds=0;accumulator=0;
 stage.applySite(site);stage.setMode('iso');stage.setYaw(0);
 stage.view.zoom=1.48;stage.view.focus=next==='arena'?{x:220,y:655}:{...rook.p};
 stage.updateCamera(0);label(next==='arena'?'Training courtyard · choose an effect':'Residential exterior · production foliage');
}
function focus(p:Pt){stage.view.focus={...p};stage.updateCamera(0);}
function draw(dt=0){stage.update(session,rook.id,dt,null,true);}
function reset(){build(mode);draw();}
function emit(surface:NonNullable<ShotEvent['surface']>,end:Pt,height:number,hit=false,down=false){
 const before=target.health;
 if(hit){target.health=down?0:Math.max(1,before-1);target.lastHitAt=session.seconds;
  if(down){target.lastDownAt=session.seconds;target.downedAt=session.seconds;target.downPose='back';}}
 const shot:ShotEvent={id:session.nextShotId++,shooterId:rook.id,targetId:hit?target.id:null,
  side:'blue',weapon:rook.weapon,start:{...rook.p},end:{...end},age:0,hit,
  healthBefore:before,healthAfter:target.health,down,shotYaw:Math.atan2(end.y-rook.p.y,end.x-rook.p.x),
  muzzleHeight:30,impactHeight:height,surface,firedAt:session.seconds};
 session.shots.push(shot);return shot;
}
function choose(kind:Sample){
 active=kind;paused=false;document.getElementById('pause')!.textContent='PAUSE';
 const next=kind==='glass'||kind==='vegetation'?'exterior':'arena';
 if(next!==mode)build(next);
 // Keep each effect sample repeatable without preserving stale injury state.
 if(kind==='hit'||kind==='down'||kind==='pool'){
  if(target.health<=0)build('arena');
 }
 if(kind==='vegetation'){
  const zone=site.exteriorZones?.find(z=>z.kind==='garden'||z.kind==='yard');
  if(zone)focus({x:zone.x+zone.w/2,y:zone.y+zone.h/2});
  label('Vegetation · current production grass and bushes');draw();return;
 }
 if(kind==='glass'){
  const pane=session.windows.find(w=>!w.shattered);
  if(!pane){build('exterior');label('All panes reset · choose GLASS again');draw();return;}
  pane.shattered=true;pane.open=true;pane.integrity=0;pane.shatteredAt=session.seconds;session.objectRevision++;
  emit('glass',{x:pane.x,y:pane.y},(pane.sillHeight??14)+12);
  focus({x:pane.x,y:pane.y});label('Glass · shatter burst and settled fragments');draw();return;
 }
 if(kind==='hit'||kind==='down'||kind==='pool'){
  if(target.health<=0){target.health=4;target.downedAt=null;target.medical={wounds:[],bloodLoss:0};}
  const shot=emit('blood',target.p,26,true,kind!=='hit');
  retainImpactMark(session,{id:session.nextEffectId++,shotId:shot.id,p:{...target.p},surface:'blood',age:0,height:.85,bloodKind:'splat',bloodAmount:kind==='hit'?1:3},site.walls);
  if(kind==='pool'||kind==='down')registerWound(target.medical,shot.id,'torso',2,session.seconds);
  focus(target.p);label(kind==='hit'?'Blood · oversized directional hit': 'Blood · untreated wound grows a persistent pool');
 }else if(kind==='stone'){
  const index=3,wall=site.walls[index],p={x:200,y:600};
  const ref=segmentAttachment('wall',index,undefined,wall,{x:p.x,y:p.y+20},{x:p.x,y:p.y-20},.5,28);
  const shot=emit('stone',p,28);
  retainImpactMark(session,{id:session.nextEffectId++,p,age:0,surface:'stone',height:28,shotId:shot.id,surfaceRef:ref});
  focus(p);label('Masonry · dust, chips and surface-attached mark');
 }else if(kind==='wood'||kind==='metal'){
  const index=site.cover.findIndex(c=>c.id==='lab-'+kind),box=session.coverState[index];
  if(!box)return;
  const p={x:box.x,y:box.y+box.h/2},height=kind==='wood'?10:25;
  const ref=coverAttachment(index,box,{x:p.x,y:p.y+20},{x:p.x,y:p.y-20},.5,height);
  const shot=emit(kind,p,height);
  retainImpactMark(session,{id:session.nextEffectId++,p,age:0,surface:kind,height,shotId:shot.id,surfaceRef:ref});
  focus({x:box.x,y:box.y});label(kind==='wood'?'Wood · splinters and dust':'Metal · sparks');
 }else if(kind==='flash'){
  const p={x:245,y:655};session.flashBursts.push({id:session.nextEffectId++,p,age:0});
  focus(p);label('Flashbang · illumination and residual dust');
 }else if(kind==='muzzle'){
  emit('dust',{x:245,y:655},1);focus(rook.p);label('Muzzle · current production flash and tracer');
 }else{
  const p={x:255,y:670};emit('dust',p,1);focus(p);label('Ground dust · current production impact puff');
 }
 draw();
}
function tick(dt:number){
 session.seconds+=dt;advanceTransientSimulationEffects(session,dt);
 sampleBleedingEvidence(session,dt);
}
const action=(id:string,fn:()=>void)=>document.getElementById(id)?.addEventListener('click',fn);
for(const kind of ['miss','hit','down','pool','stone','wood','metal','dust','glass','flash','muzzle','vegetation'] as const)action(kind,()=>choose(kind));
action('reset',()=>{paused=false;document.getElementById('pause')!.textContent='PAUSE';reset();});action('repeat',()=>choose(active));action('stabilize',()=>{
 for(const wound of target.medical.wounds)stabilizeWound(target.medical,wound.id);
 label('Stabilized · existing pools remain');draw();
});
action('pause',()=>{paused=!paused;document.getElementById('pause')!.textContent=paused?'PLAY':'PAUSE';});
action('step',()=>{paused=true;document.getElementById('pause')!.textContent='PLAY';tick(1/30);draw();});
action('iso',()=>stage.setMode('iso'));action('top',()=>stage.setMode('top'));
action('gameZoom',()=>{stage.view.zoom=1.48;stage.updateCamera(0);});
action('closeZoom',()=>{stage.view.zoom=3;stage.updateCamera(0);});
document.getElementById('speed')?.addEventListener('change',e=>{speed=Number((e.target as HTMLSelectElement).value);});
const pointers=new Map<number,Pt>();let lastMid:Pt|null=null,lastGap=0;
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const canvas=stage.canvas;canvas.style.touchAction='none';canvas.style.pointerEvents='auto';
canvas.addEventListener('pointerdown',e=>{
 e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){const [a,b]=[...pointers.values()];lastMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};lastGap=dist(a,b);}
});
canvas.addEventListener('pointermove',e=>{
 const prior=pointers.get(e.pointerId);if(!prior)return;
 const next={x:e.clientX,y:e.clientY};pointers.set(e.pointerId,next);
 if(pointers.size===2){const [a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},gap=dist(a,b);
  if(lastMid)stage.panBetween(lastMid.x,lastMid.y,mid.x,mid.y);
  if(lastGap>8)stage.zoomAt(gap/lastGap,mid.x,mid.y);lastMid=mid;lastGap=gap;
 }else stage.orbit(next.x-prior.x,next.y-prior.y);
});
const stop=(e:PointerEvent)=>{pointers.delete(e.pointerId);if(pointers.size<2){lastMid=null;lastGap=0;}};
canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
canvas.addEventListener('wheel',e=>{e.preventDefault();stage.zoomAt(Math.exp(-e.deltaY*.001),e.clientX,e.clientY);},{passive:false});
window.addEventListener('resize',()=>stage.resize(innerWidth,innerHeight));
let lastMetrics=-1;
function frame(now:number){
 const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 if(!paused){accumulator+=dt*speed;while(accumulator>=1/60){tick(1/60);accumulator-=1/60;}}
 draw(paused?0:dt*speed);
 if(now-lastMetrics>250){const stats=stage.performanceStats();metrics.textContent=
  'ZOOM '+stage.view.zoom.toFixed(2)+' · '+stats.calls+' DRAWS · '+session.impactMarks.length+' MARKS · '+session.seconds.toFixed(1)+'s';lastMetrics=now;}
 requestAnimationFrame(frame);
}
build('arena');draw();document.body.dataset.ready='true';requestAnimationFrame(frame);
