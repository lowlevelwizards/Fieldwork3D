/** R5 on-demand deterministic survey (not a human playtest).
 * npm run audit:mission-quality -- 11
 */
import {generateSite} from '../src/breach-site.ts';
import {auditSite} from '../src/breach-site-audit.ts';
import {describeSiteTopology} from '../src/worldgen/topology-diversity.ts';
import {engagementRoomRelevant} from '../src/worldgen/room-sightline-audit.ts';
import {newSession,stepSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {assessMissionFilm,summarizeMissionSamples}
 from '../src/breach-mission-quality.ts';
import {activateSite} from '../src/breach-core.ts';
const count=Math.min(48,Math.max(1,
 Number.parseInt(process.argv[2]??'11',10)||11));
const missions=['clear','intel','rescue','hold','capture'];
const observations=[],issues=[];
for(let index=0;index<count;index++){
 const seed=11+index,mission=missions[index%missions.length];
 const site=generateSite(seed,'small',undefined,{mission});
 const audit=auditSite(site);
 const session=newSession(0,seed,'floor-plan','small',mission,site);
 session.phase='running';session.started=true;
 const recording=new MissionRecorder();
 recording.capture(session,true);
 // Two seconds of real deterministic simulation, with no player orders.
 for(let tick=0;tick<120&&session.phase==='running';tick++){
  stepSession(session,1/60);recording.capture(session);
 }
 recording.capture(session,true);
 const film=assessMissionFilm(recording.frames,recording.events,
  session.operators.length);
 const topology=describeSiteTopology(site).signature;
 const entry=audit.tacticalOpportunities;
 const invalid=audit.errors.length>0||film.issues.length>0;
 observations.push({seed,mission,topology,invalid,
  objectiveDistance:entry.objectiveEntryDistance,
  verifiedApproaches:entry.verifiedApproaches,
  verifiedWindows:entry.verifiedWindows,
  verifiedDoors:entry.verifiedAlternateDoors,
  overexposedRooms:audit.sightlineQuality.filter(r=>
    r.warnings.includes('overexposed room')&&site.rooms.some(room=>
      room.id===r.roomId&&engagementRoomRelevant(room))).length,film});
 if(invalid)issues.push({seed,mission,siteErrors:audit.errors,
  replayErrors:film.issues});
 activateSite(null);
}
const summary=summarizeMissionSamples(observations);
console.log(JSON.stringify({method:'11 archetypes / 5 mission types, passive 2s actual replay',
 seeds:count,summary,issues,observations:observations.map(s=>({
 seed:s.seed,mission:s.mission,topology:s.topology,
 verifiedApproaches:s.verifiedApproaches,
 objectiveDistance:s.objectiveDistance,film:s.film}))},null,2));
if(summary.invalid)process.exitCode=1;
