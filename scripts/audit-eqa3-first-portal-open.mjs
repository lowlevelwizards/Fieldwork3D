/** EQA3.2 exact first-portal action, read-only to production rules.
 * Run an EXPLICIT user-authorable OPEN from real verified insertion,
 * allow the actual motor/hinge/AI to run, then test a known goal MOVE.
 * Does not mutate door state, teleport or invent passability.
 * This probes one real portal per trial, not a full 4-man mission.
 */
import {generateSite} from '../src/breach-site.ts';
import {newSession,availableDeployments,selectDeployment,team,
 planDoor,planMove,toggling,stepSession} from '../src/breach-game.ts';
import {setObjectiveIntelLevel} from '../src/breach-objective-intel.ts';
import {doorCenter,activateSite} from '../src/breach-core.ts';
import {doorKnown} from '../src/breach-intel.ts';
import {knownDoorApproach} from '../src/breach-plan-authoring.ts';
import {doorInteraction} from '../src/breach-interactions.ts';
import {openerThreatensLeaf} from '../src/breach-door-opening-stance.ts';
import {doorReachable,handlePoint} from '../src/breach-door.ts';
import {writeFileSync,mkdirSync} from 'node:fs';
const pairs=[[12,'intel'],[23,'rescue'],[14,'hold']];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const round=v=>Math.round(v*100)/100;
const rows=[],errors=[];
for(const [seed,mission] of pairs){
 const site=generateSite(seed,'small',undefined,{mission,enableIncidentIntent:true});
 const options=availableDeployments(newSession(0,seed,'floor-plan',
   'small',mission,site,{enableCivilians:true}));
 activateSite(null);
 const inserts=['FRONT',options.find(x=>x.id!=='FRONT'&&x.kind!=='window')?.id].filter(Boolean);
 for(const entry of inserts){
  const s=newSession(0,seed,'floor-plan','small',mission,site,{enableCivilians:true});
  try{
   if(entry!=='FRONT'&&!selectDeployment(s,entry))
    throw Error('deployment rejected: '+entry);
   setObjectiveIntelLevel(s,'confirmed');
   const a=team(s)[0],goal=s.scenario.objective;
   const start={...a.p};
   const candidates=s.doors.filter(d=>doorKnown(s.intel,d.id)&&!d.open)
    .map(d=>({door:d,position:knownDoorApproach(s,a.p,d),
     fromStart:round(dist(a.p,doorCenter(d))),
     goalDistance:round(dist(goal,doorCenter(d)))}))
    .sort((u,v)=>u.fromStart+.22*u.goalDistance-
      (v.fromStart+.22*v.goalDistance)||u.door.id.localeCompare(v.door.id));
   const attempted=[];
   let selected=null;
   for(const c of candidates){
    const authorized=planDoor(s,a.id,c.door.id,'open');
    attempted.push({id:c.door.id,known:true,
      authorized:!!authorized,reachableApproach:!!c.position,
      startDistance:c.fromStart,goalDistance:c.goalDistance,
      lockedObservedByWorld:c.door.locked});
    // Lock is recorded as *offline observer truth*, not filtered before
    // a plan is issued (no free player hidden lock knowledge).
    if(authorized){selected=c.door;break;}
   }
   const initialDoor=selected?{
    id:selected.id,locked:selected.locked,open:selected.open,
    fraction:round(selected.openFraction??0)}:null;
   let doorActionSeconds=0;
   const steps=[];
   if(selected){
    toggling(s);
    for(let i=0;i<30*20&&s.phase==='running';i++){
     stepSession(s,1/30);
     if(i%15===0)steps.push({
      t:round(s.seconds),x:round(a.p.x),y:round(a.p.y),
      doorOpen:selected.open,doorFraction:round(selected.openFraction??0),
      currentOrder:a.plan[0]?.kind??null,
      target:a.plan[0]?.p??null,
      distToTarget:a.plan[0]?.p?round(dist(a.p,a.plan[0].p)):null,
      distToHandle:round(dist(a.p,handlePoint(selected))),
      distToCenter:round(dist(a.p,doorCenter(selected))),
      actualReach:doorReachable(a.p,selected),
      interaction:doorInteraction({target:selected,actorId:a.id,
        actorPosition:a.p,action:'open'}),
      threatensLeaf:openerThreatensLeaf(selected,a.p),
      motorPause:a.motorPause,actionTimer:round(a.actionTimer),
      recoveryAttempts:a.recoveryAttempts,
      blocked:round(a.blockedTime),lastBlocker:a.lastBlocker,
      orderIssue:a.orderIssue,navLength:a.nav.length,
      velocity:round(a.velocity),
      failures:a.failedOrders,health:a.health});
     if(!a.plan.length){doorActionSeconds=round(s.seconds);break;}
    }
   }
   let goalPlanAccepted=false,goalOutcome=null;
   if(s.phase==='running'&&a.health>0){
    toggling(s);
    goalPlanAccepted=planMove(s,a.id,goal);
    if(s.phase==='planning')toggling(s);
    if(goalPlanAccepted){
     let closest=dist(a.p,goal);
     for(let i=0;i<30*35&&s.phase==='running';i++){
      stepSession(s,1/30);
      closest=Math.min(closest,dist(a.p,goal));
      if(!a.plan.length)break;
     }
     goalOutcome={closest:round(closest),
      goalDistance:round(dist(a.p,goal)),
      stage:s.mission,phase:s.phase,
      failures:a.failedOrders,blocked:round(a.blockedTime),
      motorPause:a.motorPause,health:a.health,
      remainingPlan:a.plan.length};
    }
   }
   rows.push({seed,mission,entry,start,goal,
    candidateCount:candidates.length,attempted,
    initiallySelectedDoor:initialDoor,
    doorActionSeconds,physicalDoorAtEnd:selected?{
      open:selected.open,locked:selected.locked,
      fraction:round(selected.openFraction??0)}:null,
    doorOrderFinished:!!selected&&a.plan[0]?.kind!=='door',
    samples:steps,goalPlanAccepted,goalOutcome});
  }catch(e){errors.push({seed,mission,entry,error:String(e)});}
  finally{activateSite(null);}
 }
}
const summary={trials:rows.length,exceptions:errors.length,
 authorizedOpens:rows.filter(r=>r.initiallySelectedDoor).length,
 openedByRealAction:rows.filter(r=>r.physicalDoorAtEnd?.fraction>=.72).length,
 goalPlansAccepted:rows.filter(r=>r.goalPlanAccepted).length,
 goalReached:rows.filter(r=>r.goalOutcome?.closest<25).length};
const report={schema:'EQA3.2/real-authored-open-v1',summary,errors,rows,
 caveats:'One bounded door per actual insertion, chosen by known geometry; no full-squad playthrough, no illegal door-state writes, no end-to-end successful mission guarantee. Enemy activity and injury may interrupt the trial.'};
if(process.env.EQA3_OUTPUT){
 mkdirSync('artifacts/eqa3',{recursive:true});
 writeFileSync(process.env.EQA3_OUTPUT,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({summary,errors,
 rows:rows.map(r=>({seed:r.seed,mission:r.mission,entry:r.entry,
 attempted:r.attempted.slice(0,8),
 chosen:r.initiallySelectedDoor,after:r.physicalDoorAtEnd,
 doorOrderFinished:r.doorOrderFinished,doorSeconds:r.doorActionSeconds,
 firstSteps:r.samples.slice(0,3),lastSteps:r.samples.slice(-3),
 acceptedGoal:r.goalPlanAccepted,goal:r.goalOutcome}))},null,2));
if(errors.length)process.exitCode=1;
