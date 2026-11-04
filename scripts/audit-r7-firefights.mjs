/** R7D: deterministic scripted player orders + real combat/AI/motor.
 * Not omniscient combat AI and not a substitute for human tactical play.
 * Usage: npm run audit:r7-firefights -- 6 [seconds=14]
 */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planMove,planMoveStroke,stepSession}
 from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {assessActiveTrial,summarizeActiveTrials}
 from '../src/breach-active-firefight-audit.ts';
import {activateSite} from '../src/breach-core.ts';

const requested=Number.parseInt(process.argv[2]??'6',10)||6;
const count=Math.max(1,Math.min(11,requested));
const seconds=Math.max(4,Math.min(20,Number(process.argv[3]??14)||14));
const missions=['clear','rescue','intel','hold','capture'];
const results=[];
for(let i=0;i<count;i++){
 const seed=11+i,mission=missions[i%missions.length];
 const site=generateSite(seed,'small',undefined,
  {mission,premise:i%2?'defensive':'routine'});
 const s=newSession(0,seed,'floor-plan','small',mission,site);
 let accepted=0;
 // The scripted brief selects the nearest known hostile's ROOM and
 // approaches a real mission waypoint. The movement motor and door actions
 // remain authoritative, and failed/blocked paths are reported rather than
 // teleporting an operator to the target.
 const threats=site.enemies.slice().sort((a,b)=>
  Math.hypot(a.x-site.spawn[0].x,a.y-site.spawn[0].y)-
  Math.hypot(b.x-site.spawn[0].x,b.y-site.spawn[0].y));
 const target=threats[0]??site.objective;
 for(const a of team(s).slice(0,2)){
  const waypoint=i%2?site.objective:target;
  const proposed=planMoveStroke(s,a.id,
    [site.entrance,waypoint],false,true)||
    planMove(s,a.id,waypoint);
  if(proposed)accepted++;
 }
 const recording=new MissionRecorder();
 recording.capture(s,true);
 s.phase='running';s.started=true;
 const ticks=Math.round(seconds*30);
 for(let tick=0;tick<ticks&&s.phase==='running';tick++){
  stepSession(s,1/30);recording.capture(s);
 }
 recording.capture(s,true);
 const result=assessActiveTrial(seed,mission,accepted,
  recording.frames,recording.events);
 results.push(result);
 activateSite(null);
}
const summary=summarizeActiveTrials(results);
console.log(JSON.stringify({
 method:'scripted REAL operator orders, live motor/AI/fire, 30Hz; no inserted enemies or teleports',
 seeds:count,seconds,summary,results},null,2));
// Failed navigation or non-finite/contradictory replay is a major regression;
// missing contact is reported separately and may be a valid tactical outcome.
if(results.some(r=>r.issues.length))process.exitCode=1;
