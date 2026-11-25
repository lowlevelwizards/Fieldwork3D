/** V18.0 reproducible final-site exterior baseline. No renderer or site mutation.
 * Run: node --experimental-strip-types scripts/audit-v18-exteriors.mjs [seedsPerStratum]
 */
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
const archetypes=['house','townhouse','apartment','retail','office','garage','warehouse','restaurant','motel','utility','clinic'];
const scales=['small','medium','large'];
const n=Math.max(1,Math.min(12,Number(process.argv[2])||4));
const rows=[],orientations=new Set();
const median=xs=>{const a=xs.slice().sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length?(a[m]+a[Math.floor((a.length-1)/2)])/2:0;};
const inRoom=(o,r)=>o.x>=r.x&&o.x<=r.x+r.w&&o.y>=r.y&&o.y<=r.y+r.h;
const inZone=(o,z)=>Math.abs(o.x-z.x)<=z.w/2&&Math.abs(o.y-z.y)<=z.h/2;
for(const archetype of archetypes)for(const scale of scales)for(let i=0;i<n;i++){
 const seed=17+i*101,started=performance.now();
 const site=generateSite(seed,scale,undefined,{}, {archetype});
 const elapsed=performance.now()-started;
 orientations.add(site.entrySide??'unknown');
 const exterior=site.cover.filter(o=>!site.rooms.some(r=>inRoom(o,r)));
 const zones=site.exteriorZones??[],assigned=new Map(zones.map(z=>[z.id,[]]));
 const unassigned=[];
 for(const o of exterior){
  const owners=zones.filter(z=>inZone(o,z)).sort((a,b)=>a.w*a.h-b.w*b.h||a.id.localeCompare(b.id));
  if(owners.length)assigned.get(owners[0].id).push(o);else unassigned.push(o);
 }
 const families=objects=>Object.fromEntries([...objects.reduce((m,o)=>m.set(o.fixture??'untyped',(m.get(o.fixture??'untyped')??0)+1),new Map())].sort(([a],[b])=>a.localeCompare(b)));
 rows.push({archetype,scale,seed,entry:site.entrySide,condition:site.condition,planFamily:site.planFamily,
  bounds:site.bounds,generationMs:+elapsed.toFixed(2),exteriorCount:exterior.length,
  exteriorFamilies:families(exterior),unassignedCount:unassigned.length,
  zones:zones.map(z=>{const objects=assigned.get(z.id);return {id:z.id,kind:z.kind,w:z.w,h:z.h,areaM2:z.w*z.h/400,count:objects.length,families:families(objects),physicalAreaM2:objects.reduce((sum,o)=>sum+o.w*o.h/400,0)};})});
}
const groups=archetypes.flatMap(archetype=>scales.map(scale=>{
 const set=rows.filter(r=>r.archetype===archetype&&r.scale===scale);
 const counts=set.map(r=>r.exteriorCount),zones=set.flatMap(r=>r.zones);
 return {archetype,scale,samples:set.length,min:Math.min(...counts),median:median(counts),max:Math.max(...counts),emptyZones:zones.filter(z=>!z.count).length,zones:zones.length,medianGenerationMs:median(set.map(r=>r.generationMs))};
}));
const result={samples:rows.length,orientations:[...orientations].sort(),groups,rows};
const output=process.env.V18_AUDIT_OUT??'v18-exterior-baseline.json';
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log('V18_EXTERIOR_BASELINE '+JSON.stringify({samples:result.samples,orientations:result.orientations,groups,zeroOrOne:rows.filter(r=>r.exteriorCount<=1).length,emptyZones:rows.flatMap(r=>r.zones).filter(z=>!z.count).length}));
