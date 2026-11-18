/** EQA3.0 read-only 55-site structural & decision-opportunity evidence.
 * Authoritative actual generation, mission contracts, verified insertion,
 * objective intel envelopes and encounter positions. Never runtime truth.
 * Usage: node --experimental-strip-types scripts/audit-eqa3-decisions.mjs [--smoke]
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {auditSite} from '../src/breach-site-audit.ts';
import {newSession,availableDeployments} from '../src/breach-game.ts';
import {approximateObjectiveArea,createObjectiveKnowledge}
 from '../src/breach-objective-intel.ts';
import {objectiveEntryTopology} from '../src/worldgen/objective-entry-topology.ts';
import {activateSite} from '../src/breach-core.ts';
const missions=['clear','intel','rescue','hold','capture'];
const seeds=process.argv.includes('--smoke')?[11,14,17]:Array.from({length:11},(_,i)=>11+i);
const round=n=>Math.round(n*10)/10;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const roomAt=(rooms,p)=>rooms.find(r=>r.kind==='room'&&
 p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
const rows=[],errors=[];
for(const seed of seeds)for(const mission of missions){
 try{
  const site=generateSite(seed,'small',undefined,
    {mission,enableIncidentIntent:true});
  const validity=auditSite(site);
  const session=newSession(0,seed,'floor-plan','small',mission,site,
    {enableCivilians:true});
  const civilians=session.civilians;
  const rooms=site.rooms.filter(r=>r.kind==='room');
  const objective=session.scenario.objective;
  const objectiveRoom=roomAt(rooms,objective);
  const threat=(site.encounter?.actors??[]);
  const deployment=availableDeployments(session);
  const entrances=[{id:'FRONT',kind:'primary',status:'door',
    approach:site.entrance,spots:site.spawn},
    ...deployment.filter(e=>e.id!=='FRONT')];
  const seen=new Set();
  const entries=entrances.map(entrance=>{
   const from=entrance.spots[0]??entrance.approach;
   // These are only offline candidate room distances, NOT player
   // knowledge of enemies or guarantees of actual future path length.
   const nearRooms=[...rooms].sort((a,b)=>
     distance(from,center(a))-distance(from,center(b))||
     a.id.localeCompare(b.id)).slice(0,3);
   const signature=nearRooms.map(r=>r.id).join('|');
   seen.add(signature);
   return {id:entrance.id,kind:entrance.kind,status:entrance.status,
    closestRoomIds:nearRooms.map(r=>r.id),
    closestRoomPurposes:nearRooms.map(r=>r.purpose),
    nearestHostileDistance:threat.length?round(Math.min(...threat.map(a=>
      distance(from,a.position)))):null,
    nearestCivilianDistance:civilians.length?round(Math.min(...civilians.map(c=>
      distance(from,c.p)))):null,
    objectiveDistance:round(distance(from,objective)),
    roomsNear80:rooms.filter(r=>distance(from,center(r))<80).length};
  });
  const approx=approximateObjectiveArea({...site,objective});
  const objectiveTopology=objectiveEntryTopology(site.rooms,site.doors,
    site.openings??[],site.entrance,seed,mission)
    .find(x=>x.roomId===objectiveRoom?.id);
  const nearGuards=threat.filter(a=>
    a.role!=='target'&&
    ['sentry','reserve','lookout','leader'].includes(a.role)&&
    distance(a.position,objective)<=175);
  const civilianRisk=civilians.map(c=>({
   id:c.id,rescueTarget:c.rescueTarget,homeRoom:c.homeRoomId,
   nearestThreat:threat.length?round(Math.min(...threat.map(a=>
    distance(c.p,a.position)))):null,
   startsNearDoor:site.doors.some(d=>distance(c.p,
    {x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2})<35)
  }));
  const exposure=validity.sightlineQuality.filter(x=>
    x.warnings.includes('overexposed room'));
  const risks=[
   ...(entries.length<2?['single-verified-insertion']:[]),
   ...(entries.length>1&&seen.size===1?['same-three-initial-rooms']:[]),
   ...(objectiveTopology?.directExterior&&mission!=='hold'?
     ['objective-directly-accessible-from-exterior']:[]),
   ...(mission!=='clear'&&threat.length>0&&!nearGuards.length?
     ['no-assigned-objective-security']:[]),
   ...(civilianRisk.some(x=>x.nearestThreat!==null&&x.nearestThreat<55)?
     ['civilian-within-55-of-hostile']:[]),
   ...(exposure.length?['room-exposure-review']:[])
  ];
  rows.push({seed,mission,archetype:site.archetype,
   premise:site.encounter?.premise,profile:site.encounter?.profile,
   incidentId:site.encounter?.incidentIntentId??null,
   physicalErrors:validity.errors,validityScore:validity.compositeQuality.score,
   objective:{roomId:objectiveRoom?.id??null,purpose:objectiveRoom?.purpose??null,
    directExterior:objectiveTopology?.directExterior??null,
    entryTransitions:objectiveTopology?.entryTransitions??null,
    approximateRoomCandidates:approx?.roomIds.length??0,
    approximateDistinctRooms:new Set(approx?.roomIds??[]).size,
    unknownDisclosesExact:createObjectiveKnowledge(site,'unknown').discovered},
   actors:{hostiles:threat.length,civilians:civilians.length,
    activeRescueTargets:civilians.filter(c=>c.rescueTarget).length,
    objectiveGuards:nearGuards.length,groups:site.encounter?.groups?.length??0,
    readiness:threat.reduce((out,a)=>({...out,[a.readiness]:
      (out[a.readiness]??0)+1}),{})},
   civilianRisk,entries,distinctEarlyRoomSequences:seen.size,
   roomExposure:{raw:exposure.length,affected:exposure.map(x=>x.roomId)},
   risks});
 }catch(e){errors.push({seed,mission,error:String(e)});}
 finally{activateSite(null);}
}
const count=key=>rows.filter(r=>r.risks.includes(key)).length;
const summary={cases:rows.length,buildings:new Set(rows.map(r=>r.archetype)).size,
 missions:new Set(rows.map(r=>r.mission)).size,
 invalid:rows.filter(r=>r.physicalErrors.length).length,exceptions:errors.length,
 verifiedEntryCount:rows.reduce((n,r)=>n+r.entries.length,0),
 multiEntry:rows.filter(r=>r.entries.length>=2).length,
 distinctEarlyEntries:rows.filter(r=>r.distinctEarlyRoomSequences>=2).length,
 directExteriorObjectives:count('objective-directly-accessible-from-exterior'),
 withoutNearbyAssignedSecurity:count('no-assigned-objective-security'),
 civilianHostileProximity:count('civilian-within-55-of-hostile'),
 allRoomExposureObservations:rows.reduce((n,r)=>n+r.roomExposure.raw,0),
 risks:Object.fromEntries(['single-verified-insertion','same-three-initial-rooms',
  'objective-directly-accessible-from-exterior','no-assigned-objective-security',
  'civilian-within-55-of-hostile','room-exposure-review'].map(k=>[k,count(k)]))
};
const report={schema:'EQA3.0/structural-v1',source:'frozen generated site and actual session actors',
 methodology:'55 small buildings × objectives; verified alternative deployments and actual actor positions; candidate geometric first-room proximity only, NOT a human route outcome',
 summary,errors,rows};
const file=process.env.EQA3_OUTPUT;
if(file){mkdirSync('artifacts/eqa3',{recursive:true});writeFileSync(file,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({schema:report.schema,summary,
 weakest:rows.filter(r=>r.risks.length>=3).slice(0,12).map(r=>({
 seed:r.seed,building:r.archetype,mission:r.mission,profile:r.profile,
 entries:r.entries.length,risks:r.risks})),
 errors},null,2));
if(errors.length||summary.invalid)process.exitCode=1;
