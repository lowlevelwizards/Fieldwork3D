/** R8D: two *intel* modes share physical authoritative simulation.
 * This is a scripted headless motor/replay QA, not a rendered touchscreen
 * or human 2D/3D camera playtest. Do not mistake it for device FPS.
 */
import {performance} from 'node:perf_hooks';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,planMove,stepSession}
 from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {assessMissionFilm} from '../src/breach-mission-quality.ts';
import {analyzeContactPacing} from '../src/breach-contact-pacing-audit.ts';
import {activateSite,passable} from '../src/breach-core.ts';
const count=Math.max(1,Math.min(11,Number.parseInt(process.argv[2]??'6',10)||6));
const rows=[];const missions=['clear','intel','rescue','capture','hold'];
for(let i=0;i<count;i++){
 const seed=11+i,mission=missions[i%5];
 const site=generateSite(seed,'small',undefined,{mission});
 for(const mode of ['floor-plan','true-blind']){
  const s=newSession(0,seed,mode,'small',mission,site);
  const troop=team(s),order=troop.map(a=>Number(planMove(s,a.id,
    site.entrance))).reduce((n,v)=>n+v,0);
  const recorder=new MissionRecorder();recorder.capture(s,true);
  s.phase='running';s.started=true;
  const measurements=[];let invalidPositions=0;
  for(let step=0;step<8*30&&s.phase==='running';step++){
   const start=performance.now();
   stepSession(s,1/30);measurements.push(performance.now()-start);
   recorder.capture(s);
   // The physical world does not change between the plan and blind view.
   // Crossing blocked geometry requires the real movement motor; never
   // use an artificially snapped enemy or an unapproved doorway.
   for(const a of s.operators){
    if(!Number.isFinite(a.p.x)||!Number.isFinite(a.p.y))
      invalidPositions++;
    if(a.health>0&&!a.traversal&&
       !passable(a.p,5.5))invalidPositions++;
   }
  }
  recorder.capture(s,true);
  const film=assessMissionFilm(recorder.frames,recorder.events,s.operators.length);
  const contact=analyzeContactPacing(recorder.frames,recorder.events,
    enemies(s).map(e=>e.id),order,site.encounter?.profile==='quiet-approach');
  const sorted=measurements.sort((a,b)=>a-b);
  rows.push({seed,mission,mode,orders:order,reason:contact.reason,
    firstContactAt:contact.firstContactAt,
    shots:recorder.events.filter(e=>e.kind==='shot').length,
    p95SimulationMs:Math.round(sorted[Math.floor(sorted.length*.95)]*100)/100,
    invalidPositions,replayIssues:film.issues});
  activateSite(null);
 }
}
console.log(JSON.stringify({method:'real 8s scripted motor + two intel modes; no browser render or mobile performance claim',
 rows,errors:rows.filter(r=>r.invalidPositions||r.replayIssues.length)},null,2));
if(rows.some(r=>r.invalidPositions||r.replayIssues.length))
 process.exitCode=1;
