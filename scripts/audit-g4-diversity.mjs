/** On-demand G4d cross-mission structural + physical encounter audit.
 * Usage: npm run audit:g4-diversity -- --smoke | --matrix | --full
 * Smoke 11 sites; matrix 55 sites; full 330 (11 archetypes ×
 * five missions × three scales × two seeds). No runtime player intel.
 */
import {generateSite} from '../src/breach-site.ts';
import {auditSite} from '../src/breach-site-audit.ts';
import {inspectG4DSite,summarizeG4D}
 from '../src/worldgen/g4-diversity-matrix.ts';
import {activateSite} from '../src/breach-core.ts';
const args=new Set(process.argv.slice(2));
const mode=args.has('--full')?'full':args.has('--matrix')?'matrix':'smoke';
const scales=mode==='full'?['small','medium','large']:['small'];
const missions=['clear','intel','rescue','hold','capture'];
const seeds=mode==='full'?
 Array.from({length:22},(_,i)=>11+i):
 Array.from({length:11},(_,i)=>11+i);
const rows=[],failures=[];
for(const scale of scales)for(const [i,seed] of seeds.entries()){
 const choices=mode==='smoke'?[missions[i%missions.length]]:missions;
 for(const mission of choices){
  try{
   const site=generateSite(seed,scale,undefined,{mission});
   const audited=auditSite(site);
   const row=inspectG4DSite(site,audited,mission);
   rows.push(row);
   if(row.hardFailures.length)failures.push({
    seed,scale,mission,errors:row.hardFailures
   });
  }catch(error){
   const message=String(error);
   failures.push({seed,scale,mission,errors:[message]});
  }finally{activateSite(null);}
 }
}
const summary=summarizeG4D(rows);
const report={mode,method:'headless reproducible actual-site audit; not gameplay enjoyment or device FPS',
 expected:seeds.length*scales.length*(mode==='smoke'?1:missions.length),
 summary,errors:failures.slice(0,25),truncatedErrors:Math.max(0,failures.length-25),
 observations:args.has('--rows')?rows:undefined};
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exitCode=1;
