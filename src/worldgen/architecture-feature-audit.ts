/** Reports which architectural components are actually present on a site. */
import type {Site} from '../breach-site.ts';
export type FeatureAudit={doors:number;pairs:number;shutters:number;windows:number;interiorGlass:number;fullHeightGlass:number;wideOpenings:number;outdoorZones:number;structures:number;issues:string[]};
export function auditArchitecturalFeatures(site:Site):FeatureAudit{
 const issues:string[]=[];const pairs=new Set<string>();
 for(const d of site.doors){
  if(!d.pairedWith)continue;
  const other=site.doors.find(x=>x.id===d.pairedWith);
  if(!other||other.pairedWith!==d.id){issues.push('unpaired door '+d.id);continue;}
  pairs.add([d.id,other.id].sort().join(':'));
 }
 for(const w of site.windows??[])if(w.width<=0)issues.push('invalid window '+w.id);
 return {doors:site.doors.length,pairs:pairs.size,
  shutters:site.doors.filter(d=>d.kind==='shutter').length,
  windows:site.windows?.length??0,
  interiorGlass:(site.windows??[]).filter(w=>w.interior).length,
  fullHeightGlass:(site.windows??[]).filter(w=>w.sillHeight===0).length,
  wideOpenings:site.openings?.length??0,outdoorZones:site.exteriorZones?.length??0,
  structures:site.structures?.length??0,issues};
}
