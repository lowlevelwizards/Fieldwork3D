/** Standalone omniscient generation inspector, not a tactical encounter. */
import {TacticalScene3D} from './breach-3d.ts';
import {newSession,type Session} from './breach-game.ts';
import {generateSite,type Site,type BuildingArchetype,type SiteScale} from './breach-site.ts';
import {BUILDING_ARCHETYPES} from './breach-archetypes.ts';
import {activateSite,type Pt} from './breach-core.ts';
import {auditGeneratedSite} from './breach-site-audit.ts';
import {assessArchitecture} from './worldgen/architecture-quality.ts';
import {assessRoomContracts} from './worldgen/room-contracts.ts';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const typeInput=el<HTMLSelectElement>('building');
const scaleInput=el<HTMLSelectElement>('scale');
const seedInput=el<HTMLInputElement>('seed');
const conditionInput=el<HTMLInputElement>('condition');
const conditionValue=el<HTMLOutputElement>('conditionValue');
const conditionParam=new URLSearchParams(location.search).get('condition');
let selectedCondition=conditionParam!==null&&Number.isFinite(Number(conditionParam))?
  Math.max(0,Math.min(100,Number(conditionParam))):50;
conditionInput.value=String(selectedCondition);
const playSite=el<HTMLAnchorElement>('playSite');
const status=el<HTMLOutputElement>('info');
const labelLayer=el<HTMLDivElement>('labels');
for(const kind of BUILDING_ARCHETYPES){
 const option=document.createElement('option');option.value=kind;option.textContent=kind.toUpperCase();
 typeInput.append(option);
}
const initial=Number.parseInt(new URLSearchParams(location.search).get('seed')??'101',10)||101;
const initialScale=new URLSearchParams(location.search).get('scale');
scaleInput.value=['small','medium','large','standard','expanded'].includes(initialScale??'')?
  initialScale!:'standard';
seedInput.value=String(initial);
let session:Session=newSession(0,initial);
typeInput.value=session.site?.archetype??'house';
const stage=new TacticalScene3D();
stage.setMode('iso');stage.view.zoom=1.25;
let markers:{node:HTMLElement;p:Pt;orientation?:number}[]=[];
const conditionLabel=(n:number)=>n<20?'PRISTINE':n<40?'LIVED-IN':
  n<60?'WORN':n<80?'NEGLECTED':'DECREPIT';
function previewCondition(){
 const site=session.site;if(!site)return;
 playSite.href='./breach.html?seed='+site.seed+
   (siteScale()==='standard'?'':'&scale='+siteScale())+'&condition='+selectedCondition;
 const view={...stage.view,focus:{...stage.view.focus}};
 stage.applySite({...site,conditionLevel:selectedCondition});
 Object.assign(stage.view,view);
 conditionValue.textContent=selectedCondition+' / 100 · '+conditionLabel(selectedCondition);
}
let conditionTimer:ReturnType<typeof setTimeout>|null=null;
let maskPreviewFrame:number|null=null;
function selectCondition(level:number){
 selectedCondition=level;conditionInput.value=String(level);
 if(conditionTimer!==null)clearTimeout(conditionTimer);
 conditionTimer=null;previewCondition();
}
el<HTMLButtonElement>('conditionClean').addEventListener('click',()=>selectCondition(0));
el<HTMLButtonElement>('conditionDecay').addEventListener('click',()=>selectCondition(100));
conditionInput.addEventListener('input',()=>{
 selectedCondition=Number(conditionInput.value);
 conditionValue.textContent=selectedCondition+' / 100 · '+conditionLabel(selectedCondition);
 const site=session.site;
 if(site){
  playSite.href='./breach.html?seed='+site.seed+
   (siteScale()==='standard'?'':'&scale='+siteScale())+'&condition='+selectedCondition;
  // A single queued frame updates existing patina maps. Full scene/fixture
  // regeneration is deferred until the slider settles.
  if(maskPreviewFrame===null)maskPreviewFrame=requestAnimationFrame(()=>{
    maskPreviewFrame=null;
    if(session.site)stage.previewConditionMasks(session.site,selectedCondition);
  });
 }
 if(conditionTimer!==null)clearTimeout(conditionTimer);
 conditionTimer=setTimeout(()=>{conditionTimer=null;previewCondition();},260);
});
function updateLabels(){
 labelLayer.replaceChildren();markers=[];
 const site=session.site;if(!site)return;
 const assessments=assessRoomContracts(site);
 if(el<HTMLInputElement>('rooms').checked)for(const room of site.rooms){
  const button=document.createElement('button');
  const verdict=assessments.find(a=>a.roomIds.includes(room.id));
  const showIssues=el<HTMLInputElement>('needs').checked;
  button.className=showIssues&&verdict&&!verdict.complete?'room-incomplete':'room-complete';
  button.textContent=(room.purpose??room.kind).toUpperCase()+
    (showIssues&&verdict&&!verdict.complete?' !':'');
  button.title=room.id+' · '+Math.round(room.w)+' × '+Math.round(room.h)+
    (verdict&&!verdict.complete?' · missing '+verdict.missing.length+' required groups':'');
  button.addEventListener('click',()=>{
   const contract=assessments.find(a=>a.roomIds.includes(room.id));
   status.textContent=room.id+' / '+(room.purpose??room.kind)+' · '+
    Math.round(room.w)+' × '+Math.round(room.h)+' units'+
    (contract?'\nRequired missing: '+(contract.missing.map(group=>group.join(' OR ')).join(', ')||'none')+
      '\nExpected missing: '+(contract.missingExpected.join(', ')||'none'):'');
  });
  labelLayer.append(button);markers.push({node:button,p:{x:room.x+room.w/2,y:room.y+room.h/2}});
 }
 if(el<HTMLInputElement>('doors').checked)for(const door of site.doors){
  const button=document.createElement('button');button.className='door-label';
  button.textContent=door.id;
  button.title=door.id+' · '+Math.round(Math.hypot(door.a.x-door.b.x,
    door.a.y-door.b.y))+' units';
  labelLayer.append(button);
  markers.push({node:button,p:{x:(door.a.x+door.b.x)/2,
    y:(door.a.y+door.b.y)/2}});
 }
 if(el<HTMLInputElement>('facing').checked)for(const item of site.cover){
  if(item.orientation===undefined)continue;
  const node=document.createElement('span');
  node.className='facing-arrow';node.textContent='➜';
  node.title=(item.fixture??'fixture')+' · facing '+item.orientation*90+'°';
  labelLayer.append(node);
  markers.push({node,p:{x:item.x,y:item.y},orientation:item.orientation});
 }
 if(el<HTMLInputElement>('cover').checked)for(const item of site.cover){
  const dot=document.createElement('span');dot.className='cover-dot';
  dot.title=item.fixture??'obstacle';labelLayer.append(dot);
  markers.push({node:dot,p:{x:item.x,y:item.y}});
 }
}
function describe(site:Site){
 const count=site.rooms.filter(room=>room.kind==='room').length;
 const structure=assessArchitecture(site);
 return site.archetype?.toUpperCase()+' · '+site.name+' · seed '+site.seed+
  '\n'+(site.planFamily??site.layout)+' · '+structure.zones+' functional zones / '+
  structure.nonrectangularZones+' irregular rooms\n'+
  count+' floor sections / '+site.doors.length+' doors / '+(site.openings?.length??0)+
  ' open passages / '+site.cover.length+' physical props / '+
  (site.exteriorZones?.length??0)+' exterior zones';
}
function report(site:Site):string{
 const result=auditGeneratedSite(site.seed,site.scale??'standard');
 // The legacy audit temporarily activates its own site for route checks.
 // Restore the live lab's spatial authority before resuming rendering.
 activateSite(site);
 return describe(site)+'\n'+
  'ENTRANCE: '+assessArchitecture(site).entryPurpose.toUpperCase()+' · '+
  (site.condition??'ordinary').toUpperCase()+' · '+result.dressing+
  ' details · '+result.typedProps+' typed props · '+result.archOpenings+
  ' wide openings\n'+result.emptyRooms.length+' unfurnished functional rooms / '+ 
  result.functionalRooms+' rooms total\n'+
  result.incompleteZones.length+' functionally incomplete zones\n'+
  (result.unitContracts.length?
    result.unitContracts.filter(u=>u.complete).length+'/'+result.unitContracts.length+
      ' complete residential units\n':'')+(result.errors.length?
   'CHECKS: '+result.errors.join('; '):'CHECKS: PASS');
}
// Site scale changes dimensions, not architectural fidelity or room count.
const siteScale=():SiteScale=>scaleInput.value as SiteScale;
function generate(advance=false){
 const starting=Math.max(1,Number.parseInt(seedInput.value,10)||1)+(advance?1:0);
 const wanted=typeInput.value as BuildingArchetype;
 let chosen:Site|null=null;
 for(let step=0;step<600;step++){
  const candidate=generateSite((starting+step)>>>0,
    siteScale());
  if(candidate.archetype===wanted){
   chosen=candidate;break;
  }
 }
 if(!chosen){status.textContent='No matching configuration in the current generator range.';return;}
 seedInput.value=String(chosen.seed);
 playSite.href='./breach.html?seed='+chosen.seed+
   (siteScale()==='standard'?'':'&scale='+siteScale())+
   '&condition='+selectedCondition;
 session=newSession(0,chosen.seed,'floor-plan',
   siteScale());
 stage.applySite({...session.site!,conditionLevel:selectedCondition});stage.resetCamera();
 history.replaceState(null,'','?seed='+chosen.seed+
  (siteScale()==='standard'?'':'&scale='+siteScale())+'&condition='+selectedCondition);
 status.textContent=report(session.site!)+'\nVISUAL CONDITION: '+selectedCondition+' / 100';
 updateLabels();
}
el<HTMLButtonElement>('generate').addEventListener('click',()=>generate());
el<HTMLButtonElement>('next').addEventListener('click',()=>generate(true));
el<HTMLButtonElement>('iso').addEventListener('click',()=>stage.setMode('iso'));
el<HTMLButtonElement>('top').addEventListener('click',()=>stage.setMode('top'));
el<HTMLButtonElement>('fit').addEventListener('click',()=>stage.resetCamera());
el<HTMLInputElement>('rooms').addEventListener('change',updateLabels);
el<HTMLInputElement>('needs').addEventListener('change',updateLabels);
el<HTMLInputElement>('cover').addEventListener('change',updateLabels);
el<HTMLInputElement>('facing').addEventListener('change',updateLabels);
el<HTMLInputElement>('doors').addEventListener('change',updateLabels);
let pointers=new Map<number,Pt>(),lastMid:Pt|null=null,lastGap=0;
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
document.body.addEventListener('pointerdown',event=>{
 if((event.target as Element).closest('header,#controls,#labels'))return;
 event.preventDefault();document.body.setPointerCapture(event.pointerId);
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
});
document.body.addEventListener('pointermove',event=>{
 const prior=pointers.get(event.pointerId);if(!prior)return;
 const next={x:event.clientX,y:event.clientY};
 const dx=next.x-prior.x,dy=next.y-prior.y;
 pointers.set(event.pointerId,next);
 if(pointers.size===2){
  const [a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  const gap=dist(a,b);
  if(lastMid)stage.panBetween(lastMid.x,lastMid.y,mid.x,mid.y);
  if(lastGap>8)stage.zoomAt(gap/lastGap,mid.x,mid.y);
  lastMid=mid;lastGap=gap;
 }else stage.orbit(dx,dy);
});
const stop=(e:PointerEvent)=>{pointers.delete(e.pointerId);if(pointers.size<2){lastMid=null;lastGap=0;}};
document.body.addEventListener('pointerup',stop);
document.body.addEventListener('pointercancel',stop);
window.addEventListener('wheel',e=>{e.preventDefault();stage.zoomAt(Math.exp(-e.deltaY*.001),e.clientX,e.clientY);},{passive:false});
window.addEventListener('resize',()=>stage.resize(innerWidth,innerHeight));
status.textContent=describe(session.site!);
playSite.href='./breach.html?seed='+session.site!.seed+'&condition='+selectedCondition;
previewCondition();
updateLabels();
let last=performance.now();
function frame(now:number){
 const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 stage.update(session,'rook',dt,null,true);
 for(const marker of markers){
  const p=stage.project(marker.p,5);
  marker.node.style.left=p.x+'px';marker.node.style.top=p.y+'px';
  if(marker.orientation!==undefined){
   const v=[{x:0,y:1},{x:1,y:0},{x:0,y:-1},{x:-1,y:0}][marker.orientation];
   const point=stage.project({x:marker.p.x+v.x*25,y:marker.p.y+v.y*25},5);
   marker.node.style.transform='translate(-50%,-50%) rotate('+
     Math.atan2(point.y-p.y,point.x-p.x)+'rad)';
  }
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
