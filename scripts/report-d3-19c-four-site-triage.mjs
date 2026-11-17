/** Usage: node scripts/report-d3-19c-four-site-triage.mjs audit.json [output.json]
 * This consumes existing R7 physical-motor evidence; it does not rerun or
 * change the simulation. It is intentionally strict about 45s and 22 sites.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {analyzeD319FourSiteFailures} from './lib/d3-19c-four-site-triage.mjs';
const source=process.argv[2],destination=process.argv[3];
if(!source)throw Error('Usage: report-d3-19c-four-site-triage.mjs audit.json [output.json]');
const analysis=analyzeD319FourSiteFailures(
 JSON.parse(readFileSync(source,'utf8')));
const result=JSON.stringify(analysis,null,2)+'\n';
if(destination)writeFileSync(destination,result);
else process.stdout.write(result);
