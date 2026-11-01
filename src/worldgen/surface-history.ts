/** Small reproducible visual histories; independent from combat/save state. */
import {seeded,type Site} from '../breach-site.ts';
import {roomPixelSurface} from './pixel-surface-selection.ts';
import {canWear,type WearEffect} from './material-properties.ts';
import {effectiveCondition} from './condition-visual.ts';
import type {WearMark,WearKind} from './environment-wear.ts';
export type SurfaceIncident={id:string;roomId:string;kind:WearEffect;
 severity:number;source:'usage'|'leak'|'repair'|'weather'|'impact'};
export type SurfaceRepair={incidentId:string;quality:number};
export type SurfaceHistory={version:1;siteSeed:number;incidents:SurfaceIncident[];
 repairs:SurfaceRepair[]};
export function generateSurfaceHistory(site:Site):SurfaceHistory{
 const rng=seeded(site.seed^0x82ae981a),incidents:SurfaceIncident[]=[];
 const continuous=site.conditionLevel!==undefined,t=effectiveCondition(site)/100;
 if(continuous?t<.12:site.condition==='occupied')
   return {version:1,siteSeed:site.seed,incidents,repairs:[]};
 const roomKinds:Record<string,WearEffect>={
  garage:'oil',warehouse:'scratch',restaurant:'grease',utility:'drip',
  motel:'stain',apartment:'scuff',office:'scuff',clinic:'scuff',
 };
 const prefer=roomKinds[site.archetype??'']??'stain';
 for(const [i,r] of site.rooms.entries()){
  if(incidents.length>=(continuous?Math.min(10,Math.round(t*11)):5))break;
  if(rng()>(continuous?.08+.82*t:.35))continue;
  const surface=roomPixelSurface(site.archetype,r.purpose??r.kind);
  const role=r.purpose??r.kind;
  const contextual:WearEffect=['bathroom','restroom','utility','laundry'].includes(role)?'drip':
   ['kitchen','pantry'].includes(role)?'grease':
   ['bay','workshop','equipment','maintenance'].includes(role)?'oil':
   ['loading','aisle','service'].includes(role)?'mud':prefer;
  const kind=canWear(surface,contextual)?contextual:
   canWear(surface,prefer)?prefer:canWear(surface,'scuff')?'scuff':'dust';
  incidents.push({id:'history:'+i,roomId:r.id,kind,
   severity:continuous?.2+t*.60+rng()*.16:.28+rng()*.44,
   source:kind==='oil'||kind==='grease'?'usage':
    kind==='drip'?'leak':'weather'});
 }
 return {version:1,siteSeed:site.seed,incidents,repairs:[]};
}
export function applySurfaceRepair(h:SurfaceHistory,repair:SurfaceRepair):SurfaceHistory{
 return {...h,repairs:[...h.repairs.filter(r=>r.incidentId!==repair.incidentId),
  {incidentId:repair.incidentId,quality:Math.max(0,Math.min(1,repair.quality))}]};
}
export function planHistoryWear(site:Site,h=generateSurfaceHistory(site)):WearMark[]{
 const rng=seeded(site.seed^0x902c3dbb),out:WearMark[]=[];
 for(const incident of h.incidents){
  const r=site.rooms.find(room=>room.id===incident.roomId);
  if(!r)continue;
  const repair=h.repairs.find(p=>p.incidentId===incident.id);
  const severity=incident.severity*(1-(repair?.quality??0));
  const size=Math.min(28,Math.max(10,Math.min(r.w,r.h)*.18));
  const clamp=(n:number,low:number,high:number)=>Math.min(high,Math.max(low,n));
  const kind=incident.kind as WearKind;
  const anchors:Record<string,readonly string[]>={
   drip:['sink','laundry-machine','toilet','bathtub','shower'],
   oil:['vehicle-lift','compressor','generator','tank'],
   grease:['stove','counter','kitchen-island','workbench'],
   scratch:['workbench','desk','dining-table'],
   mud:['vehicle','rack','pallet'],
  };
  const fixture=site.cover.find(o=>o.fixture&&anchors[kind]?.includes(o.fixture)&&
    o.x>=r.x&&o.x<=r.x+r.w&&o.y>=r.y&&o.y<=r.y+r.h);
  const x=clamp(fixture?.x??r.x+r.w*(.32+rng()*.36),r.x+size/2,r.x+r.w-size/2);
  const y=clamp(fixture?.y??r.y+r.h*(.32+rng()*.36),r.y+size/2,r.y+r.h-size/2);
  const rotation=rng()*Math.PI;
  // A repair leaves a readable mismatched-finish patch, not a magically
  // spotless surface. Old damage intensity decreases underneath it.
  if(repair?.quality&&repair.quality>.2){
   out.push({id:incident.id+':repair',roomId:r.id,kind:'fade',
     x,y,width:size*1.2,depth:size*.95,rotation,opacity:.08+.3*repair.quality});
  }
  if(severity<.07)continue;
  out.push({id:incident.id,roomId:r.id,kind,x,y,
    width:size,depth:size*.7,rotation,opacity:Math.min(.42,severity*.55)});
  const t=site.conditionLevel===undefined?0:effectiveCondition(site)/100;
  // A leak, spill, or impact creates a related spatial cluster. Related marks
  // share the incident's anchor rather than scattering independently.
  const clusterCount=t>.58?Math.min(2,Math.floor((t-.48)*4)):0;
  const surface=roomPixelSurface(site.archetype,r.purpose??r.kind);
  const secondary:WearEffect=incident.source==='leak'?'mineral':
    incident.source==='usage'?'stain':'chip';
  for(let k=0;k<clusterCount;k++){
   const variant=canWear(surface,secondary)?secondary:
     canWear(surface,'stain')?'stain':'scuff';
   out.push({id:incident.id+':spread:'+k,roomId:r.id,kind:variant,
     x:clamp(x+(rng()-.5)*size*1.1,r.x+size/4,r.x+r.w-size/4),
     y:clamp(y+(rng()-.5)*size*.9,r.y+size/4,r.y+r.h-size/4),
     width:size*(.6+.3*rng()),depth:size*(.35+.2*rng()),
     rotation:rng()*Math.PI,opacity:Math.min(.4,severity*.38)});
  }
 }
 return out;
}
export const encodeSurfaceHistory=(h:SurfaceHistory)=>JSON.stringify(h);
export function decodeSurfaceHistory(json:string):SurfaceHistory{
 const value=JSON.parse(json) as SurfaceHistory;
 if(value.version!==1||!Number.isFinite(value.siteSeed)||
  !Array.isArray(value.incidents)||!Array.isArray(value.repairs))
  throw Error('unsupported surface history');
 return value;
}
