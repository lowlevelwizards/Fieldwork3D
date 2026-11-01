/** npm-free seeded architecture quality report. Run with:
 * node --experimental-strip-types scripts/sample-worldgen-quality.mjs 11 medium
 */
import {sampleSiteQuality} from '../src/worldgen/quality-matrix.ts';
const count=Number(process.argv[2]??11);
const scale=process.argv[3]??'medium';
if(!Number.isInteger(count)||count<1||count>48||
 !['small','medium','large','standard','expanded'].includes(scale))
 throw new Error('Usage: sample-worldgen-quality.mjs [1..48 seeds] [small|medium|large]');
const report=sampleSiteQuality(Array.from({length:count},(_,i)=>i+1),scale);
process.stdout.write(JSON.stringify(report,null,2)+'\n');
