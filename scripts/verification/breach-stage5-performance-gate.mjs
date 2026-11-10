/** Roadmap 2 Stage 5 -- single reproducible CI performance evidence command.
 * No hard-coded elapsed-time/heap limits across GitHub runner generations.
 * Stable scenario coverage, outcome gates and film retention ARE blocking.
 */
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {validateStage5Evidence} from './breach-stage5-performance-contract.mjs';

const seconds=90;
function run(label,flags,file,args=[]){
 const command=[...flags,file,...args];
 const result=spawnSync(process.execPath,command,{
  encoding:'utf8',maxBuffer:8*1024*1024,timeout:240000,
  env:process.env
 });
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 if(result.error)throw Error(label+' failed to run: '+result.error.message);
 if(result.status!==0)throw Error(label+' exited '+result.status);
 return result.stdout;
}
const simulationOutput=run('simulation workload',
 ['--experimental-strip-types'],'scripts/bench-breach-performance.mjs');
const retentionOutput=run('replay retention workload',
 ['--expose-gc','--experimental-strip-types'],
 'scripts/bench-breach-round-lifetime.mjs',['--seconds='+seconds]);
const evidence=validateStage5Evidence({
 simulationOutput,retentionOutput,retentionSeconds:seconds
});
mkdirSync('artifacts/performance',{recursive:true});
const destination='artifacts/performance/roadmap2-stage5-host.json';
writeFileSync(destination,JSON.stringify(evidence,null,2)+'\n');
console.log('ROADMAP 2 STAGE 5 PERFORMANCE EVIDENCE PASS');
console.log('Host performance report (not iPhone FPS): '+destination);
