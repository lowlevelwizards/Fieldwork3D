/** Optional real-worldgen smoke audit.
 * npm run audit:realism -- 11 medium
 * npm run audit:realism -- 11 all
 * For complete seed variety select 11+ sites; "all" samples 3 sizes.
 * Only --strict sets a failing exit code when an invalid map appears.
 */
import {auditReleaseMatrix} from '../src/worldgen/release-health.ts';
const count=Math.max(1,Math.min(48,Number.parseInt(process.argv[2]??'11',10)||11));
const which=process.argv[3]??'medium';
const scales=which==='all'?['small','medium','large']:
 [(['small','medium','large'].includes(which)?which:'medium')];
if(count*scales.length>48)
 throw Error('Reduce seed count: release audit has a 48-map budget');
const report=auditReleaseMatrix(Array.from({length:count},(_,i)=>i),scales);
console.log(JSON.stringify({
 ...report,samples:report.samples.map(s=>({...s,durationMs:s.durationMs})),
 timingNote:'Host wall-time including audit and route checks, not mobile FPS'
},null,2));
if(process.argv.includes('--strict')&&report.invalid>0)process.exitCode=1;
