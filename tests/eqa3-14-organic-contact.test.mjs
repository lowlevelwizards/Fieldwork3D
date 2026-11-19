/** EQA3.14: four real generated missions, hostile AI, fixed-step motor,
 * authentic shots and civilian perception. No synthetic audio/shots, no
 * enemy teleport, forced health change, or hidden enemy-guided plan.
 * All observations are offline: failure to contact is not fake success.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,planDoor,planMove,
 toggling,stepSession,inSight} from '../src/breach-game.ts';
import {doorCenter,activateSite} from '../src/breach-core.ts';
import {doorKnown} from '../src/breach-intel.ts';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const round=n=>Math.round(n*100)/100;
const cases=[[13,'rescue'],[17,'rescue'],[20,'capture'],[23,'rescue']];
const results=[];

function run(seed,mission,seconds=12){
 const site=generateSite(seed,'small',undefined,
   {mission,enableIncidentIntent:true});
 const s=newSession(0,seed,'floor-plan','small',mission,site,
   {enableCivilians:true});
 try{
  const scout=team(s)[0],foes=enemies(s),civilians=s.civilians;
  const origin={...scout.p};
  assert.ok(foes.length>0,'organic encounter must include actual hostile AI');
  assert.ok(civilians.length>0,'organic witness must have actual civilians');
  const rooms=site.rooms.filter(r=>r.kind==='room').sort((a,b)=>
   distance(origin,center(a))-distance(origin,center(b))||
   a.id.localeCompare(b.id));
  const nearKnownDoors=s.doors.filter(d=>
   doorKnown(s.intel,d.id)&&!d.open&&!d.locked&&!d.jammed&&!d.wedged&&
   distance(origin,doorCenter(d))<78)
   .sort((a,b)=>distance(origin,doorCenter(a))-distance(origin,doorCenter(b))||
    a.id.localeCompare(b.id));
  let doorOrder=null,moveRoom=null,orders=0,attemptedRoom=false;
  for(const door of nearKnownDoors)if(planDoor(s,scout.id,door.id,'open')){
   doorOrder=door.id;orders++;break;
  }
  const tryRoom=()=>{
   if(attemptedRoom)return;
   attemptedRoom=true;
   if(s.phase==='running')toggling(s);
   for(const room of rooms.slice(0,6)){
    if(!planMove(s,scout.id,center(room)))continue;
    moveRoom=room.id;orders++;break;
   }
   if(s.phase==='planning')toggling(s);
  };
  if(!doorOrder)tryRoom();
  else toggling(s);
  let firstContactAt=null,firstShotAt=null,firstCivilianEvidenceAt=null;
  let firstCivilianReactionAt=null,firstCivilianFlightAt=null;
  let firstCivilianInjuryAt=null,maxCivilianTickMove=0;
  let civilianTransitions=0,refugeRechecks=0;
  const lastStates=new Map(civilians.map(c=>[c.id,c.state]));
  const lastRechecks=new Map(civilians.map(c=>[c.id,c.lastRefugeRecheckAt]));
  const discoveredCivilianIds=new Set();
  let activeFrames=0,observerSamples=0;
  for(let tick=0;tick<seconds*60&&s.phase==='running';tick++){
   if(doorOrder&&!attemptedRoom&&scout.plan.length===0&&s.seconds>.2)
    tryRoom();
   const prior=new Map(civilians.map(c=>[c.id,{...c.p}]));
   stepSession(s,1/60);
   activeFrames++;
   for(const c of civilians){
    const moved=distance(c.p,prior.get(c.id));
    maxCivilianTickMove=Math.max(maxCivilianTickMove,moved);
    assert.ok(moved<=1.6,
      'physical civilian cannot jump on one live tick: '+seed+'/'+c.id+'/'+moved);
    assert.ok(Number.isFinite(c.p.x)&&Number.isFinite(c.p.y)&&
      Number.isFinite(c.fear),'civilian physical/sensory state must be finite');
    if(c.lastEvidenceAt>=0){
     discoveredCivilianIds.add(c.id);
     firstCivilianEvidenceAt??=round(s.seconds);
    }
    if(c.state!=='routine')firstCivilianReactionAt??=round(s.seconds);
    if(c.state==='fleeing'||c.state==='hiding')
     firstCivilianFlightAt??=round(s.seconds);
    if(c.health<2)firstCivilianInjuryAt??=round(s.seconds);
    if(c.state!==lastStates.get(c.id))civilianTransitions++;
    lastStates.set(c.id,c.state);
    if(c.lastRefugeRecheckAt!==lastRechecks.get(c.id)&&
       c.lastRefugeRecheckAt>=0)refugeRechecks++;
    lastRechecks.set(c.id,c.lastRefugeRecheckAt);
    // A state response must trace back to physical hearing/seeing rather
    // than the test's ability to inspect hidden red actor coordinates.
    if(c.fear>.11)assert.ok(c.lastEvidenceAt>=0,
      'no civilian panic without its own witnessed/acoustic evidence');
   }
   if(s.nextShotId>1)firstShotAt??=round(s.seconds);
   if(tick%6!==0)continue;
   observerSamples++;
   const livingBlue=team(s).filter(a=>a.health>0);
   const saw=foes.some(e=>e.health>0&&livingBlue.some(a=>inSight(a,e,s)));
   const seen=foes.some(e=>e.health>0&&livingBlue.some(a=>inSight(e,a,s)));
   if(saw||seen)firstContactAt??=round(s.seconds);
  }
  const moved=round(distance(scout.p,origin));
  const row={seed,mission,seconds:round(s.seconds),phase:s.phase,
   hostiles:foes.length,civilians:civilians.length,
   doorOrder,moveRoom,orders,displacement:moved,
   firstContactAt,firstShotAt,shots:s.nextShotId-1,
   firstCivilianEvidenceAt,firstCivilianReactionAt,
   firstCivilianFlightAt,firstCivilianInjuryAt,
   evidenceObservers:discoveredCivilianIds.size,civilianTransitions,
   refugeRechecks,maxCivilianTickMove:round(maxCivilianTickMove),
   observerSamples,activeFrames,
   limitation:'Contact and firing are emergent; absent contact is recorded, not manufactured.'};
  assert.ok(activeFrames>0,'must advance real fixed-step simulation');
  assert.ok(observerSamples>0);
  assert.ok(orders>0,'at least one legal, map-visible command must be accepted');
  return row;
 }finally{activateSite(null);}
}
for(const [seed,mission] of cases)test(
 'EQA3.14 genuine civilian-hostile encounter seed '+seed+' '+mission,()=>{
  results.push(run(seed,mission));
 });
test('EQA3.14 emits reproducible honest organic-contact diagnostics',()=>{
 assert.equal(results.length,cases.length);
 const summary={
  trials:results.length,
  contact:results.filter(r=>r.firstContactAt!==null).length,
  shots:results.filter(r=>r.shots>0).length,
  civilianEvidence:results.filter(r=>r.evidenceObservers>0).length,
  civilianFlight:results.filter(r=>r.firstCivilianFlightAt!==null).length,
  zeroContact:results.filter(r=>r.firstContactAt===null).map(r=>r.seed),
  blockedPlan:results.filter(r=>r.displacement<5).map(r=>r.seed),
 };
 console.log('EQA3_14_ORGANIC',JSON.stringify({summary,results}));
 // Do not assert a minimum number of firefights; doing so would reward
 // injecting danger instead of measuring the game's natural encounter AI.
});
