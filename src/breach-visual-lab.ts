import {TacticalScene3D} from './breach-3d.ts';
import {newSession,team,enemies,type ShotEvent,type Session} from './breach-game.ts';
import {activateSite,type Pt} from './breach-core.ts';
import {retainCollapsePuff} from './breach-atmosphere-evidence.ts';
import {damageCover} from './breach-reactive-cover.ts';
import {recordDoorFracture} from './breach-fracture-record.ts';
import {buildTrainingSite} from './training/training-site-builder.ts';
import {DEFAULT_TRAINING_CONFIG} from './training/training-courses.ts';
import {generateSite,type Site} from './breach-site.ts';
import {segmentAttachment,coverAttachment} from './breach-impact-surface.ts';
import {damageWindow,windowPaneSegment} from './breach-windows.ts';
import {retainImpactMark} from './breach-impact-evidence-buffer.ts';
import {registerWound,stabilizeWound} from './breach-medical-wounds.ts';
import {sampleBleedingEvidence} from './breach-blood-evidence.ts';
import {advanceTransientSimulationEffects} from './breach-simulation-phases.ts';
import {emitSpentCasing} from './breach-casing-emission.ts';
import {casingAt} from './breach-effects.ts';
import {casingLanding} from './breach-casing-trajectory.ts';
import {muzzleAtShot} from './breach-muzzle.ts';
import {FAMILY_PRESETS} from './equipment-weapon-families.ts';
import {initialWeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {initialEquipmentLoadout} from './equipment-loadouts.ts';
import {initialSecondaryEquipment} from './secondary-equipment.ts';

/** Lab-only authored event fixtures, rendered by the production pipeline.
 * No campaign persistence, tactical shot authority or alternate VFX engine. */
type Sample='miss'|'hit'|'down'|'pool'|'stone'|'wood'|'metal'|'dust'|'glass'|'glass-door'|'collapse'|'flash'|'muzzle'|'vegetation'|'casings';
const stage=new TacticalScene3D(),legacy=newSession();
const targetTemplate=enemies(legacy)[0];
if(!targetTemplate)throw Error('Missing lab actor template');
const arena=buildTrainingSite({...DEFAULT_TRAINING_CONFIG,squadSize:1});
arena.cover.push(
 {id:'lab-wood',fixture:'desk',x:310,y:665,w:28,h:26,low:true,topHeight:20},
 {id:'lab-metal',fixture:'support-column',x:390,y:665,w:16,h:16,low:false,topHeight:40});
// An explicit glazed leaf in the authored lab fixture set.
if(arena.doors.length)arena.doors[0].style='glazed';
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
function draw(dt=0){stage.update(session,rook.id,dt,null,true);drawCasingDebug();}
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
const casingSelect=(id:string)=>document.getElementById(id) as HTMLInputElement|HTMLSelectElement;
const casingDebug=document.getElementById('casingDebugOverlay') as unknown as SVGSVGElement;
const casingWeapon=casingSelect('casingWeapon') as HTMLSelectElement;
let debugSession:Session|null=null,debugProjection='';
for(const preset of FAMILY_PRESETS){
 const option=document.createElement('option');option.value=preset.id;option.textContent=preset.name;
 casingWeapon.append(option);
}
const pistolOption=document.createElement('option');
pistolOption.value='glock';pistolOption.textContent='Glock · held pistol';casingWeapon.append(pistolOption);
function drawCasingDebug(){
 const enabled=active==='casings'&&(casingSelect('casingDebug') as HTMLInputElement).checked;
 casingDebug.style.display=enabled?'block':'none';
 if(!enabled){if(casingDebug.childElementCount)casingDebug.replaceChildren();debugSession=null;return;}
 const project=(p:{x:number;y:number;z:number})=>stage.project({x:p.x,y:p.z},p.y);
 const key=[innerWidth,innerHeight,session.casings.length,...[
  {x:0,y:0,z:0},{x:100,y:0,z:0},{x:0,y:100,z:0},{x:0,y:0,z:100}
 ].flatMap(p=>{const v=project(p);return [Math.round(v.x*4),Math.round(v.y*4)];})].join(':');
 if(debugSession===session&&debugProjection===key)return;
 debugSession=session;debugProjection=key;
 casingDebug.setAttribute('viewBox','0 0 '+innerWidth+' '+innerHeight);
 const ns='http://www.w3.org/2000/svg';
 const nodes:SVGElement[]=[];
 for(const c of session.casings){
  if(!c.flight)continue;
  const path=document.createElementNS(ns,'path');
  const duration=c.flight.legs.reduce((sum,l)=>sum+l.duration,0);
  const pts=Array.from({length:25},(_,i)=>project(casingAt(c,c.at+duration*i/24)));
  path.setAttribute('d',pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' '));
  path.setAttribute('stroke','#d8b369');path.setAttribute('stroke-opacity','.48');path.setAttribute('fill','none');
  nodes.push(path);
  for(const [p,color] of [[project(c),'#fff3bf'],[project(casingLanding(c.flight)),'#e4b467']] as const){
   const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',String(p.x));dot.setAttribute('cy',String(p.y));
   dot.setAttribute('r','2.5');dot.setAttribute('fill',color);nodes.push(dot);
  }
 }
 casingDebug.replaceChildren(...nodes);
}
function casingSample(){
 build('arena');
 active='casings';
 const value=casingWeapon.value;
 const preset=FAMILY_PRESETS.find(p=>p.id===value);
 if(value==='legacy'){rook.weapon='carbine';rook.weaponConfiguration=initialWeaponConfiguration('carbine');}
 const pistol=value==='glock'?'glock-g19x' as const:undefined;
 if(preset){rook.weapon=preset.weapon;rook.weaponConfiguration={
  ...initialWeaponConfiguration(preset.weapon),build:{family:preset.family,parts:{...preset.parts}}};}
 if(pistol){
  rook.equipment={...initialEquipmentLoadout(),secondary:initialSecondaryEquipment(rook.id,pistol)};
  rook.secondarySwitch={active:'secondary',desired:'secondary',fraction:1};
 }
 rook.aim=.98;rook.velocity=0;rook.recoil=0;
 // Isolate the shooter and use the existing physical scene fixtures.
 session.operators=[rook];
 const obstacle=casingSelect('casingObstacle').value;
 if(obstacle!=='none'){
  const fixture=obstacle==='wall'?'support-column':'crate';
  const box={id:'lab-casing-obstacle',fixture,x:rook.p.x+10,y:rook.p.y+20,w:obstacle==='wall'?50:20,h:6,
   low:obstacle!=='wall',topHeight:obstacle==='wall'?40:13};
  // Build a detached site: don't mutate the shared training fixture or live mission.
  site={...site,cover:[...site.cover,box]};
  activateSite(site);session=newSession(0,site.seed,'full-view','small','hold',site);
  session.operators=[rook];session.civilians=[];stage.applySite(site);
 }
 const count=Math.max(1,Math.min(64,Math.round(Number(casingSelect('casingCount').value)||12)));
 const interval=Math.max(.04,Math.min(1,Number(casingSelect('casingInterval').value)||.12));
 const scale=Math.max(.5,Math.min(1.5,Number(casingSelect('casingScale').value)||1));
 const seed=Math.max(1,Math.min(1000000,Math.round(Number(casingSelect('casingSeed').value)||1)));
 const friction=casingSelect('casingFloor').value==='soft'?.3:casingSelect('casingFloor').value==='slick'?.95:.65;
 const muzzle=muzzleAtShot({x:rook.p.x,z:rook.p.y,heading:rook.heading,weaponYaw:rook.weaponYaw,
  weapon:rook.weapon,weaponConfiguration:rook.weaponConfiguration,equipment:rook.equipment,
  aim:rook.aim,velocity:0,recoil:0,posture:rook.posture,secondaryWeapon:pistol,sampleEjection:true});
 for(let i=0;i<count;i++)emitSpentCasing(session,rook,seed*100+i,muzzle,pistol,{at:i*interval,visualScale:scale,friction});
 focus({x:rook.p.x+4,y:rook.p.y+16});stage.view.zoom=3;stage.updateCamera(0);
 label('Spent casings · '+count+' planned · '+(preset?.name??(pistol?'Glock':'Carbine'))+' · seed '+seed);
 draw();
}
function choose(kind:Sample){
 const prior=active;
 active=kind;paused=false;document.getElementById('pause')!.textContent='PAUSE';
 if(kind==='casings'){casingSample();return;}
 const next=kind==='glass'||kind==='vegetation'?'exterior':'arena';
 if(next!==mode||prior==='casings')build(next);
 // Keep each effect sample repeatable without preserving stale injury state.
 if(kind==='hit'||kind==='down'||kind==='pool'){
  if(target.health<=0)build('arena');
 }
 if(kind==='vegetation'){
  const zone=site.exteriorZones?.find(z=>z.kind==='garden'||z.kind==='yard');
  if(zone)focus({x:zone.x,y:zone.y});
  label('Exterior · grass and shrubs temporarily retired');draw();return;
 }
 if(kind==='glass-door'){
  let door=session.doors.find(d=>d.style==='glazed'&&!d.glassShattered);
  if(!door){build('arena');door=session.doors.find(d=>d.style==='glazed'&&!d.glassShattered);}
  if(!door){label('No glass door sample available');draw();return;}
  door.glassIntegrity=0;door.glassShattered=true;recordDoorFracture(door,session.seconds);session.objectRevision++;
  const p={x:door.glassBreakX??door.a.x,y:door.glassBreakY??door.a.y};
  focus(p);label('Glass door · fractured leaf, grounded debris');draw();return;
 }
 if(kind==='collapse'){
  let box=session.coverState.find(c=>c.id==='lab-wood');
  if(box?.destroyed){build('arena');box=session.coverState.find(c=>c.id==='lab-wood');}
  if(!box)return;
  damageCover(box,10,session.seconds);retainCollapsePuff(session,box);session.objectRevision++;
  focus(box);label('Wood fixture · collapsed, larger debris and dust');draw();return;
 }
 if(kind==='glass'){
  const pane=session.windows.find(w=>!w.shattered);
  if(!pane){build('exterior');label('All panes reset · choose GLASS again');draw();return;}
  const base=pane.sillHeight??14,head=pane.headHeight??32;
  const offset=(pane.integrity===3?-1:1)*pane.width*.16;
  const point={x:pane.x+(pane.vertical?0:offset),y:pane.y+(pane.vertical?offset:0)};
  const height=base+(head-base)*.30;
  const from={x:point.x+(pane.vertical?20:0),y:point.y+(pane.vertical?0:20)},to={x:2*point.x-from.x,y:2*point.y-from.y};
  const ref=segmentAttachment('window',session.windows.indexOf(pane),pane.id,windowPaneSegment(pane),from,to,.5,height);
  damageWindow(pane,1);session.objectRevision++;
  if(pane.shattered)pane.shatteredAt=session.seconds;
  const shot=emit('glass',point,height);
  retainImpactMark(session,{id:session.nextEffectId++,shotId:shot.id,p:point,age:0,surface:'glass',height,surfaceRef:ref});
  focus({x:pane.x,y:pane.y});label(pane.shattered?'Glass · shattered, settled fragments':`Glass · damaged ${3-pane.integrity}/3 · repeat to fracture`);draw();return;
 }
 if(kind==='hit'||kind==='down'||kind==='pool'){
  if(target.health<=0){target.health=4;target.downedAt=null;target.medical={wounds:[],bloodLoss:0};}
  const shot=emit('blood',target.p,26,true,kind!=='hit');
  retainImpactMark(session,{id:session.nextEffectId++,shotId:shot.id,p:{...target.p},surface:'blood',age:0,height:.85,bloodKind:'splat',bloodAmount:kind==='hit'?1:3},site.walls);
  if(kind==='pool'||kind==='down')registerWound(target.medical,shot.id,'torso',2,session.seconds);
  focus(target.p);label(kind==='hit'?'Blood · oversized directional hit': 'Blood · small drops accumulate into a persistent pool');
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
  const shot=emit(kind,p,height);shot.impactFixture=box.fixture;
  retainImpactMark(session,{id:session.nextEffectId++,p,age:0,surface:kind,height,shotId:shot.id,surfaceRef:ref});
  focus({x:box.x,y:box.y});label(kind==='wood'?'Wood desk · splinters, paper and dust':'Metal · sparks');
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
for(const kind of ['miss','hit','down','pool','stone','wood','metal','dust','glass','glass-door','collapse','flash','muzzle','vegetation'] as const)action(kind,()=>choose(kind));
action('casings',()=>choose('casings'));
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
  'ZOOM '+stage.view.zoom.toFixed(2)+' · '+stats.calls+' DRAWS · '+session.impactMarks.length+' MARKS · '+session.seconds.toFixed(1)+'s'+(active==='casings'?' · '+session.casings.filter(c=>c.at<=session.seconds).length+' CASES':'');lastMetrics=now;}
 requestAnimationFrame(frame);
}
build('arena');draw();document.body.dataset.ready='true';requestAnimationFrame(frame);
