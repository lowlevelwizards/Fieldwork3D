/** Roadmap 2 Stage 2 extended generated-map physical integrity matrix.
 * node --experimental-strip-types scripts/audit-roadmap2-physical-integrity.mjs
 * node --experimental-strip-types scripts/audit-roadmap2-physical-integrity.mjs 44 all
 * all = small, standard, medium, expanded, large. Offline only; no runtime overhead.
 */
import {generateSite} from '../src/breach-site.ts';
import {auditSitePhysicalIntegrity} from '../src/worldgen/site-physical-integrity.ts';
const count=Math.min(55,Math.max(1,Number.parseInt(process.argv[2]??'44',10)||44));
const choice=process.argv[3]??'all';
const scales=choice==='all'?['small','standard','medium','expanded','large']:
 [(['small','standard','medium','expanded','large'].includes(choice)?choice:'small')];
const cases=[],byArchetype=new Map(),byOrientation=new Map();
let warnings=0,failures=0,checkedRooms=0,checkedDoors=0;
for(const scale of scales)for(let seed=0;seed<count;seed++){
 try{
  const site=generateSite(seed,scale);
  const audit=auditSitePhysicalIntegrity(site);
  checkedRooms+=audit.checkedRooms;checkedDoors+=audit.checkedDoors;
  warnings+=audit.warnings.length;failures+=Number(audit.blocking.length>0);
  const key=site.archetype??'unknown',orientation=site.entrySide??'unknown';
  byArchetype.set(key,(byArchetype.get(key)??0)+1);
  byOrientation.set(orientation,(byOrientation.get(orientation)??0)+1);
  if(audit.blocking.length)cases.push({seed,scale,archetype:key,
   errors:audit.blocking});
 }catch(error){
  failures++;
  cases.push({seed,scale,error:String(error)});
 }
}
console.log(JSON.stringify({
 matrix:{seedsPerScale:count,scales,samples:count*scales.length},
 checkedRooms,checkedDoors,invalidSites:failures,diagnosticWarnings:warnings,
 byArchetype:Object.fromEntries([...byArchetype].sort()),
 byOrientation:Object.fromEntries([...byOrientation].sort()),
 failures:cases.slice(0,24)
},null,2));
if(failures)process.exitCode=1;
