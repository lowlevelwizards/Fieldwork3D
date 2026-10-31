/** Optional reproducible procedural encounter stress run.
 * Usage: npm run audit:breach-sites -- 1000 */
import {performance} from 'node:perf_hooks';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
const count=Math.max(1,Math.min(10000,
  Number.parseInt(process.argv[2]??'1000',10)||1000));
const start=performance.now();
let failed=0,max=0;
const types=new Map(),layouts=new Map(),conditions=new Map(),errors=[];
let openPassages=0,exteriorZones=0,decorativeDetails=0,typedProps=0;
for(let seed=1;seed<=count;seed++){
  const before=performance.now();
  const result=auditGeneratedSite(seed);
  max=Math.max(max,performance.now()-before);
  types.set(result.archetype,(types.get(result.archetype)??0)+1);
  layouts.set(result.layout,(layouts.get(result.layout)??0)+1);
  conditions.set(result.condition,(conditions.get(result.condition)??0)+1);
  openPassages+=result.archOpenings;
  exteriorZones+=result.exteriorZones;
  decorativeDetails+=result.dressing;
  typedProps+=result.typedProps;
  if(result.errors.length){
    failed++;
    if(errors.length<15)errors.push(result);
  }
}
const seconds=(performance.now()-start)/1000;
console.log(JSON.stringify({seeds:count,failed,
  seconds:+seconds.toFixed(2),mapsPerSecond:+(count/seconds).toFixed(1),
  slowestMapMs:+max.toFixed(1),
  archetypes:Object.fromEntries(types),layouts:Object.fromEntries(layouts),
  conditions:Object.fromEntries(conditions),
  openPassages,exteriorZones,decorativeDetails,typedProps,
  examples:errors},null,2));
if(failed)process.exitCode=1;
