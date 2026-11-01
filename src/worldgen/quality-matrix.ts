/** Seed-matrix design audit; compare real generated architecture by archetype.
 * No new renderer or hidden retries. The single-site audit is authoritative.
 * Aggregation is deterministic and does not alter encounter generation.
 */
import type {SiteScale} from '../breach-site.ts';
import {auditGeneratedSite,type SiteAudit} from '../breach-site-audit.ts';
export type QualityRow={
 archetype:string;count:number;invalid:number;
 averagePenalty:number;incompleteZones:number;
 blockedWorkFaces:number;unreachableWorkFaces:number;
 distinctPlans:number;distinctEntrySides:number;largestPlanShare:number;
};
export type QualityMatrix={
 sampled:number;invalidSites:number;averagePenalty:number;
 repeatedFamilyShare:number;distinctFamilies:number;
 worst:{seed:number;archetype:string;penalty:number;errors:number}[];
 byArchetype:QualityRow[];
};
export function summarizeSiteQuality(audits:readonly SiteAudit[]):QualityMatrix{
 const kinds=new Map<string,SiteAudit[]>();
 for(const audit of audits)
  kinds.set(audit.archetype,[...(kinds.get(audit.archetype)??[]),audit]);
 const average=(nums:readonly number[])=>
  nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length*10)/10:0;
 const byArchetype=[...kinds].map(([archetype,rows]):QualityRow=>({
  archetype,count:rows.length,
  invalid:rows.filter(r=>r.errors.length>0).length,
  averagePenalty:average(rows.map(r=>r.designQuality.score)),
  incompleteZones:rows.reduce((n,r)=>n+r.incompleteZones.length,0),
  blockedWorkFaces:rows.reduce((n,r)=>n+r.serviceIssues.length,0),
  unreachableWorkFaces:rows.reduce((n,r)=>n+
   r.operationalRouteIssues.filter(i=>i.reason==='unreachable').length,0),
  distinctPlans:new Set(rows.map(r=>r.planFamily??r.layout??'untyped')).size,
  distinctEntrySides:new Set(rows.map(r=>r.entrySide??'unknown')).size,
  largestPlanShare:Math.round(100*Math.max(0,...[...new Set(
    rows.map(r=>r.planFamily??r.layout??'untyped'))].map(f=>
      rows.filter(r=>(r.planFamily??r.layout??'untyped')===f).length))/rows.length)
 })).sort((a,b)=>a.archetype.localeCompare(b.archetype));
 const familyNames=audits.map(a=>a.archetype+':'+(a.planFamily??a.layout??'untyped'));
 const distinctFamilies=new Set(familyNames).size;
 return {sampled:audits.length,distinctFamilies,
  repeatedFamilyShare:familyNames.length?
    Math.round(100*(familyNames.length-distinctFamilies)/familyNames.length):0,
  invalidSites:audits.filter(a=>a.errors.length>0).length,
  averagePenalty:average(audits.map(a=>a.designQuality.score)),
  worst:audits.map(a=>({seed:a.seed,archetype:a.archetype,
   penalty:a.designQuality.score,errors:a.errors.length}))
   .sort((a,b)=>b.errors-a.errors||b.penalty-a.penalty||a.seed-b.seed)
   .slice(0,5),
  byArchetype};
}
/** Explicitly bounded on-demand sample, never used during normal Map Lab play. */
export function sampleSiteQuality(seeds:readonly number[],
 scale:SiteScale='small'):QualityMatrix{
 if(seeds.length>48)throw Error('seed quality sample capped at 48 sites');
 return summarizeSiteQuality(seeds.map(seed=>auditGeneratedSite(seed,scale)));
}
