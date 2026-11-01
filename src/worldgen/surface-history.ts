/** Small reproducible visual histories; independent from combat/save state. */
import {seeded,type Site} from '../breach-site.ts';
import {roomPixelSurface} from './pixel-surface-selection.ts';
import {canWear,type WearEffect} from './material-properties.ts';
import type {WearMark,WearKind} from './environment-wear.ts';
export type SurfaceIncident={id:string;roomId:string;kind:WearEffect;
 severity:number;source:'usage'|'leak'|'repair'|'weather'|'impact'};
export type SurfaceRepair={incidentId:string;quality:number};
export type SurfaceHistory={version:1;siteSeed:number;incidents:SurfaceIncident[];
 repairs:SurfaceRepair[]};
export function generateSurfaceHistory(site:Site):SurfaceHistory{
 const rng=seeded(site.seed^0x82ae981a),incidents:SurfaceIncident[]=[];
 if(site.condition==='occupied')return {version:1,siteSeed:site.seed,incidents,repairs:[]};
 const roomKinds:Record<string,WearEffect>={
  garage:'oil',warehouse:'scratch',restaurant:'grease',utility:'drip',
  motel:'stain',apartment:'scuff',office:'scuff',clinic:'scuff',
 };
 const prefer=roomKinds[site.archetype??'']??'stain';
 for(const [i,r] of site.rooms.entries()){
  if(incidents.length>=5)break;
  if(rng()>.35)continue;
  const surface=roomPixelSurface(site.archetype,r.purpose??r.kind);
  const kind=canWear(surface,prefer)?prefer:canWear(surface,'scuff')?'scuff':'dust';
  incidents.push({id:'history:'+i,roomId:r.id,kind,
   severity:.28+rng()*.44,source:kind==='oil'||kind==='grease'?'usage':
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
  if(severity<.07)continue;
  const size=Math.min(28,Math.max(10,Math.min(r.w,r.h)*.18));
  out.push({id:incident.id,roomId:r.id,kind:incident.kind as WearKind,
   x:r.x+r.w*(.32+rng()*.36),y:r.y+r.h*(.32+rng()*.36),
   width:size,depth:size*.7,rotation:rng()*Math.PI,
   opacity:Math.min(.42,severity*.55)});
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
