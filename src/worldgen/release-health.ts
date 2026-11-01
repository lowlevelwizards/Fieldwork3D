/** On-demand release-quality rollup from the *actual* site-audit pipeline.
 * Never called by Quick Play, Campaign, or the normal Map Lab generator.
 * Timings are relative CI/host measures and are not an iPhone FPS claim.
 */
import type {SiteScale} from '../breach-site.ts';
import {auditGeneratedSite,type SiteAudit} from '../breach-site-audit.ts';
import {summarizeSiteQuality} from './quality-matrix.ts';
export type ReleaseSample={seed:number;scale:SiteScale;
 archetype:string;family:string;entrySide:string;
 durationMs:number;errors:string[];rooms:number;doors:number;props:number};
export type ReleaseSummary={
 sampled:number;scales:SiteScale[];archetypes:number;
 invalid:number;distinctFamilies:number;repeatedFamilyShare:number;
 entrySides:Record<string,number>;slowestMs:number;medianMs:number;
 byArchetype:ReturnType<typeof summarizeSiteQuality>['byArchetype'];
 worst:ReturnType<typeof summarizeSiteQuality>['worst'];
 samples:ReleaseSample[]};
export function rollupReleaseSamples(
 samples:readonly ReleaseSample[],audits:readonly SiteAudit[]):ReleaseSummary{
 if(samples.length!==audits.length)throw Error('Each sampled site must have an audit');
 const quality=summarizeSiteQuality(audits);
 const sorted=samples.map(x=>x.durationMs).sort((a,b)=>a-b);
 const entrySides:Record<string,number>={};
 for(const sample of samples){
  entrySides[sample.entrySide]=(entrySides[sample.entrySide]??0)+1;
 }
 return {sampled:samples.length,
  scales:[...new Set(samples.map(s=>s.scale))],
  archetypes:new Set(samples.map(s=>s.archetype)).size,
  invalid:samples.filter(s=>s.errors.length>0).length,
  distinctFamilies:quality.distinctFamilies,
  repeatedFamilyShare:quality.repeatedFamilyShare,entrySides,
  medianMs:sorted.length?Math.round(sorted[Math.floor((sorted.length-1)/2)]):0,
  slowestMs:sorted.length?Math.round(sorted[sorted.length-1]):0,
  byArchetype:quality.byArchetype,worst:quality.worst,
  samples:[...samples]};
}
export function auditReleaseMatrix(seeds:readonly number[],
 scales:readonly SiteScale[]=['medium']):ReleaseSummary{
 if(seeds.length*scales.length>48)throw Error('Release audit capped at 48 maps');
 const samples:ReleaseSample[]=[],audits:SiteAudit[]=[];
 for(const scale of scales)for(const seed of seeds){
  const started=performance.now();
  const audit=auditGeneratedSite(seed,scale);
  const durationMs=Math.round(performance.now()-started);
  audits.push(audit);
  samples.push({seed,scale,archetype:audit.archetype,
   family:audit.planFamily??audit.layout??'unknown',
   entrySide:audit.entrySide??'unknown',
   durationMs,errors:[...audit.errors],
   rooms:audit.rooms,doors:audit.doors,props:audit.typedProps});
 }
 return rollupReleaseSamples(samples,audits);
}
