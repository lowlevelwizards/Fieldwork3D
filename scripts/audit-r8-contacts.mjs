/** R8A — real GO orders to public objective/entry, no hidden-enemy
 * targeting. Captures actual sight, distance, pathing and gunfire.
 * npm run audit:r8-contacts -- 11
 */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,planMove,planMoveStroke,stepSession}
 from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {analyzeContactPacing,summarizeContactPacing}
 from '../src/breach-contact-pacing-audit.ts';
import {activateSite} from '../src/breach-core.ts';
const count=Math.max(1,Math.min(11,Number.parseInt(process.argv[2]??'11',10)||11));
const missions=['clear','rescue','intel','hold','capture'];
const samples=[];
for(let i=0;i<count;i++){
 const seed=11+i,mission=missions[i%missions.length];
 const site=generateSite(seed,'small',undefined,{
  mission,premise:i%2?'defensive':'routine'});
 const s=newSession(0,seed,'floor-plan','small',mission,site);
 let accepted=0;
 for(const a of team(s).slice(0,2)){
  // Only the briefing entrance and known mission marker are legal inputs.
  // Do not select the nearest undiscovered hostile, as the R7 smoke did.
  const waypoint=site.objective;
  if(planMoveStroke(s,a.id,[site.entrance,waypoint],false,true)||
     planMove(s,a.id,site.entrance))accepted++;
 }
 const ids=enemies(s).map(a=>a.id);
 const recording=new MissionRecorder();
 recording.capture(s,true);
 s.phase='running';s.started=true;
 for(let t=0;t<14*30&&s.phase==='running';t++){
  stepSession(s,1/30);recording.capture(s);
 }
 recording.capture(s,true);
 const row=analyzeContactPacing(recording.frames,recording.events,
  ids,accepted,site.encounter?.profile==='quiet-approach');
 samples.push({seed,mission,accepted,...row});
 activateSite(null);
}
const summary=summarizeContactPacing(samples);
console.log(JSON.stringify({method:'scripted public entrance/objective movement + actual AI; hidden enemy positions used only after the film for offline QA',
 summary,samples},null,2));
// Reporting an uncontacted mission is NOT a failure. Invalid orders are.
if(samples.some(s=>s.reason==='no-valid-orders'))process.exitCode=1;
