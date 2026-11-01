/** Standalone omniscient generation inspector, not a tactical encounter. */
import {TacticalScene3D} from './breach-3d.ts';
import {newSession,type Session} from './breach-game.ts';
import {type Site,type BuildingArchetype} from './breach-site.ts';
import {labScaleChoice,type LabScale,type GeneratorRequest,type GeneratorResponse,type GeneratorTiming} from './map-lab-generation.ts';
import {BUILDING_ARCHETYPES} from './breach-archetypes.ts';
import {type Pt} from './breach-core.ts';
import type {SiteAudit} from './breach-site-audit.ts';
import {assessArchitecture} from './worldgen/architecture-quality.ts';
import {assessRoomContracts} from './worldgen/room-contracts.ts';
import {inspectCounterAccess} from './worldgen/service-counter-access.ts';
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
const progressPanel=el<HTMLDivElement>('generationProgress');
const progressBar=el<HTMLProgressElement>('progressBar');
const progressPercent=el<HTMLOutputElement>('progressPercent');
const progressStage=el<HTMLDivElement>('progressStage');
const progressDetail=el<HTMLSpanElement>('progressDetail');
const progressClock=el<HTMLSpanElement>('progressClock');
const generateButton=el<HTMLButtonElement>('generate');
const nextButton=el<HTMLButtonElement>('next');
for(const kind of BUILDING_ARCHETYPES){
 const option=document.createElement('option');option.value=kind;option.textContent=kind.toUpperCase();
 typeInput.append(option);
}
const initial=Number.parseInt(new URLSearchParams(location.search).get('seed')??'101',10)||101;
const initialScale=new URLSearchParams(location.search).get('scale');
scaleInput.value=labScaleChoice(initialScale);
seedInput.value=String(initial);
// Initial preview also uses the worker: no silent startup freeze.
let session:Session=newSession(0);
let siteReady=false;
typeInput.value=BUILDING_ARCHETYPES[(initial>>>0)%BUILDING_ARCHETYPES.length];
const stage=new TacticalScene3D();
stage.setMode('iso');stage.view.zoom=1.25;
let markers:{node:HTMLElement;p:Pt;orientation?:number}[]=[];
let reportBaseline='';
let currentAudit:SiteAudit|null=null;
const functionalSummary=el<HTMLDivElement>('functionalSummary');
const functionalWarnings=el<HTMLDivElement>('functionalWarnings');
function showFunctionalQuality(site:Site,audit:SiteAudit){
 const space=audit.spaceQuality;
 functionalSummary.textContent='Average solid footprint: '+
  Math.round(space.averageSolidFraction*100)+'% · '+
  space.crowdedRoomIds.length+' crowded rooms · '+
  space.doorApproachIssues.length+' doorway conflicts · '+
  audit.incompleteZones.length+' incomplete zones · '+
  audit.operationalRouteIssues.length+' work-route issues';
 functionalWarnings.replaceChildren();
 const issues=[
  ...space.rooms.filter(r=>r.crowded).map(r=>({
    label:r.roomId+' / '+r.purpose+' · '+Math.round(r.solidFraction*100)+'% furnished',
    roomId:r.roomId
  })),
  ...space.doorApproachIssues.map(d=>({
    label:d.doorId+' / nearby '+d.fixture,roomId:''
  })),
  ...audit.serviceIssues.map(i=>({
    label:i.roomId+' / '+i.fixture+' · '+i.reason,roomId:i.roomId
  })),
  ...audit.incompleteZones.map(id=>({
    label:id+' / missing essential fixture',roomId:id
  }))
 ];
 if(!issues.length){
  functionalWarnings.textContent='No measured space or fixture warnings.';
  return;
 }
 for(const issue of issues.slice(0,28)){
  const button=document.createElement('button');
  button.type='button';button.className='quality-warning';
  button.textContent=issue.label;
  button.addEventListener('click',()=>{
   const room=site.rooms.find(r=>r.id===issue.roomId||
     (r.zoneId??r.id)===issue.roomId);
   const metric=space.rooms.find(r=>r.roomId===room?.id);
   status.textContent='QUALITY WARNING: '+issue.label+
    (metric?'\nRoom area: '+metric.areaM2+' m² · '+
      metric.solidCount+' physical objects · '+
      Math.round(metric.freeFraction*100)+'% estimated free floor':'');
   if(room){stage.view.focus={x:room.x+room.w/2,y:room.y+room.h/2};}
  });
  functionalWarnings.append(button);
 }
 if(issues.length>28){
  const note=document.createElement('span');
  note.textContent=' +'+(issues.length-28)+' more; see main audit';
  functionalWarnings.append(note);
 }
}
const conditionLabel=(n:number)=>n<20?'PRISTINE':n<40?'LIVED-IN':
  n<60?'WORN':n<80?'NEGLECTED':'DECREPIT';
function paintConditionDiagnostics(){
 const site=session.site;if(!site)return;
 const stats=stage.wearStats();
 status.textContent=reportBaseline+'\nCONDITION: '+selectedCondition+
   '/100 · '+conditionLabel(selectedCondition)+
   '\nSURFACES: '+site.rooms.length+' room floors / '+site.walls.length+' walls'+
   '\nLOCALIZED WEAR: '+stats.markCount+' marks · '+
   Math.round(stats.effectiveAlpha*100)+'% mean mask intensity'+
   ' · '+stats.lowVisibility+' very subtle marks';
}
function previewCondition(){
 const site=session.site;if(!site)return;
 playSite.href='./breach.html?seed='+site.seed+
   '&scale='+(site.scale??'medium')+'&condition='+selectedCondition;
 const view={...stage.view,focus:{...stage.view.focus}};
 stage.applySite({...site,conditionLevel:selectedCondition});
 Object.assign(stage.view,view);
 conditionValue.textContent=selectedCondition+' / 100 · '+conditionLabel(selectedCondition);
 paintConditionDiagnostics();
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
   '&scale='+(site.scale??'medium')+'&condition='+selectedCondition;
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
  const spaceMetric=currentAudit?.spaceQuality.rooms.find(r=>r.roomId===room.id);
  button.title=room.id+' · '+Math.round(room.w)+' × '+Math.round(room.h)+
    (spaceMetric?' · '+Math.round(spaceMetric.solidFraction*100)+'% solid':'')+
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
 const counterAccess=inspectCounterAccess(site);
 const usable=counterAccess.filter(a=>a.customerClear&&a.staffClear).length;
 return site.archetype?.toUpperCase()+' · '+site.name+' · seed '+site.seed+
  '\n'+(site.planFamily??site.layout)+' · '+structure.zones+' functional zones / '+
  structure.nonrectangularZones+' irregular rooms\n'+
  count+' floor sections / '+site.doors.length+' doors / '+(site.openings?.length??0)+
  ' open passages / '+site.cover.length+' physical props / '+
  (site.exteriorZones?.length??0)+' exterior zones\n'+
  usable+'/'+counterAccess.length+' service counters with two-sided access';
}
function report(site:Site,result:SiteAudit):string{
 return describe(site)+'\n'+
  'ENTRANCE: '+assessArchitecture(site).entryPurpose.toUpperCase()+' · '+
  (site.condition??'ordinary').toUpperCase()+' · '+result.dressing+
  ' details · '+result.typedProps+' typed props · '+result.archOpenings+
  ' wide openings\n'+result.emptyRooms.length+' unfurnished functional rooms / '+ 
  result.functionalRooms+' rooms total\n'+
  result.incompleteZones.length+' functionally incomplete zones\n'+
  'SPATIAL QUALITY: '+Math.round(result.spaceQuality.averageSolidFraction*100)+
  '% mean solid footprint · '+result.spaceQuality.crowdedRoomIds.length+
  ' crowded rooms · '+result.spaceQuality.doorApproachIssues.length+
  ' doorway proximity warnings\n'+
  'FUNCTIONAL QUALITY: '+result.designQuality.score+' penalty points'+
  ' · '+result.designQuality.criticalMissing+' critical fixtures missing'+
  ' · '+result.designQuality.incompleteUnits+' incomplete units'+
  ' · '+result.designQuality.counterAccessProblems+' counter access issues\n'+
  result.serviceIssues.length+' blocked fixture working faces\n'+
  result.operationalRouteIssues.length+' unreachable/blocked workstation approaches'+
  (result.operationalRouteIssues.length?': '+
   result.operationalRouteIssues.slice(0,3).map(i=>i.fixture+' '+i.side+' ('+i.reason+')').join(', '):'')+'\n'+
  result.missingWorkflowLinks.length+' missing direct workflow links'+
  (result.missingWorkflowLinks.length?': '+
   result.missingWorkflowLinks.slice(0,4).map(link=>link.a+' / '+link.b).join(', ')+
   (result.missingWorkflowLinks.length>4?' +more':''):'')+'\n'+
  (result.unitContracts.length?
    result.unitContracts.filter(u=>u.complete).length+'/'+result.unitContracts.length+
      ' complete residential units\n':'')+(result.errors.length?
   'CHECKS: '+result.errors.join('; '):'CHECKS: PASS');
}
// Stage percentages are measured checkpoints, not predicted time.
const siteScale=():LabScale=>scaleInput.value as LabScale;
let worker:Worker|null=null,generationId=0,generating=false,percent=0;
let startedAt=0,lastUpdate=0,clock:ReturnType<typeof setInterval>|null=null;
const cancelButton=el<HTMLButtonElement>('cancelGeneration');
function showProgress(value:number,stage:string,detail=''){
 percent=Math.max(percent,Math.min(100,Math.round(value)));
 progressBar.value=percent;progressPercent.textContent=percent+'%';
 progressStage.textContent=stage;progressDetail.textContent=detail;
}
function clockTick(){
 const elapsed=Math.floor((performance.now()-startedAt)/1000);
 const quiet=Math.floor((performance.now()-lastUpdate)/1000);
 progressClock.textContent=elapsed+'s elapsed'+
   (generating&&quiet>10?' · No new checkpoint yet (large plans can take time)':'');
}
function setBusy(active:boolean){
 generating=active;
 generateButton.disabled=active;nextButton.disabled=active;
 typeInput.disabled=active;scaleInput.disabled=active;seedInput.disabled=active;
 playSite.setAttribute('aria-disabled',String(active||!siteReady));
 playSite.style.pointerEvents=active||!siteReady?'none':'';
 if(!active&&clock!==null){clearInterval(clock);clock=null;}
}
function stopGeneration(){
 if(!generating)return;
 generationId++;worker?.terminate();worker=null;setBusy(false);
 progressPanel.hidden=true;
 status.textContent=siteReady?reportBaseline+'\\nGeneration cancelled. Previous site retained.':
   'Generation cancelled. Press GENERATE to retry.';
}
cancelButton.addEventListener('click',stopGeneration);
function generationError(message:string){
 worker?.terminate();worker=null;setBusy(false);
 progressPanel.dataset.state='error';progressPanel.hidden=false;
 progressStage.textContent='GENERATION FAILED';
 progressDetail.textContent=message;
 progressClock.textContent='Stopped · try a different seed or size';
 status.textContent='GENERATION FAILED: '+message;
}
const allowPaint=()=>new Promise<void>(resolve=>
 requestAnimationFrame(()=>setTimeout(resolve,0)));
async function useGeneratedSite(id:number,site:Site,audit:SiteAudit,choice:LabScale,timing:GeneratorTiming){
 worker?.terminate();worker=null;
 showProgress(85,'Creating tactical session','Loading actors and navigation');
 await allowPaint();
 if(id!==generationId)return;
 try{
  showProgress(91,'Building 3D preview','Uploading fixtures, surfaces and wear');
  await allowPaint();
  if(id!==generationId)return;
  // Commit simulation and scene together; cancellation never leaves a mismatched site.
  const previewStart=performance.now();
  session=newSession(0,site.seed,'floor-plan',site.scale,undefined,site);
  stage.applySite({...site,conditionLevel:selectedCondition});stage.resetCamera();
  const previewMs=Math.round(performance.now()-previewStart);
  reportBaseline=report(site,audit)+'\nTIMING: worldgen '+
    timing.generationMs+'ms · audit '+timing.auditMs+
    'ms · worker total '+timing.workerMs+'ms · preview '+previewMs+'ms';
  seedInput.value=String(site.seed);
  playSite.href='./breach.html?seed='+site.seed+
    '&scale='+(site.scale??'medium')+'&condition='+selectedCondition;
  history.replaceState(null,'','?seed='+site.seed+'&scale='+choice+
    '&condition='+selectedCondition);
  siteReady=true;currentAudit=audit;
  updateLabels();showFunctionalQuality(site,audit);paintConditionDiagnostics();
  showProgress(100,'MAP READY',(site.archetype??'BUILDING').toUpperCase()+
    ' · '+(site.scale??'medium').toUpperCase()+' · '+site.rooms.length+' rooms');
  setBusy(false);
  setTimeout(()=>{if(generationId===id&&!generating)progressPanel.hidden=true;},1400);
 }catch(error){generationError(error instanceof Error?error.message:String(error));}
}
function generate(advance=false){
 if(generating)return;
 const seed=Math.max(1,Number.parseInt(seedInput.value,10)||1)+(advance?1:0);
 const id=++generationId,archetype=typeInput.value as BuildingArchetype,choice=siteScale();
 percent=0;progressPanel.hidden=false;progressPanel.dataset.state='running';
 showProgress(0,'Starting generator','Preparing '+archetype+' · '+choice);
 startedAt=performance.now();lastUpdate=startedAt;setBusy(true);
 clockTick();clock=setInterval(clockTick,1000);
 try{
  worker=new Worker(new URL('./map-lab-worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=(event:MessageEvent<GeneratorResponse>)=>{
   const response=event.data;
   if(!generating||response.id!==generationId)return;
   lastUpdate=performance.now();
   if(response.kind==='progress')
    showProgress(response.percent,response.stage,response.detail);
   else if(response.kind==='error')generationError(response.message);
   else void useGeneratedSite(id,response.site,response.audit,choice,response.timing);
  };
  worker.onerror=event=>{
   event.preventDefault();
   if(generationId===id)generationError('Generator stopped unexpectedly. Try again.');
  };
  const request:GeneratorRequest={id,seed,archetype,scale:choice};
  worker.postMessage(request);
 }catch(error){generationError(error instanceof Error?error.message:String(error));}
}
generateButton.addEventListener('click',()=>generate());
nextButton.addEventListener('click',()=>generate(true));
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
 if((event.target as Element).closest('header,#controls,#labels,#generationProgress'))return;
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
status.textContent='Starting map generator…';
conditionValue.textContent=selectedCondition+' / 100 · '+conditionLabel(selectedCondition);
void generate();
let last=performance.now();
function frame(now:number){
 const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 if(siteReady)stage.update(session,'rook',dt,null,true);
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
