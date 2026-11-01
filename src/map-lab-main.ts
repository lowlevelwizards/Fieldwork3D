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
let markers:{node:HTMLElement;p:Pt}[]=[];
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
  result.incompleteZones.length+' functionally incomplete zones\n'+(result.errors.length?
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
   (siteScale()==='standard'?'':'&scale='+siteScale());
 session=newSession(0,chosen.seed,'floor-plan',
   siteScale());
 stage.applySite(session.site??null);stage.resetCamera();
 history.replaceState(null,'','?seed='+chosen.seed+
  (siteScale()==='expanded'?'&scale=expanded':''));
 status.textContent=report(session.site!);
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
playSite.href='./breach.html?seed='+session.site!.seed;
updateLabels();
let last=performance.now();
function frame(now:number){
 const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 stage.update(session,'rook',dt,null,true);
 for(const marker of markers){
  const p=stage.project(marker.p,5);
  marker.node.style.left=p.x+'px';marker.node.style.top=p.y+'px';
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
