import test from 'node:test';
import assert from 'node:assert/strict';
import {doorRangeSite,prepareDoorRangeCase}
 from '../src/breach-door-test-cases.ts';
import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

for(const id of ['inward-left','outward-left','inward-right','outward-right']){
 test('D2-D3 LIVE full four-operator crossing '+id+' finishes without ping-pong',()=>{
  const s=newSession(0,undefined,'full-view','small','hold',
   doorRangeSite(id),{enableCivilians:false});
  try{
   prepareDoorRangeCase(s,id);
   const squad=team(s).slice(0,4);
   assert.equal(planSquadEntry(s,'ENTRY'),true);
   const initial=squad.map(a=>new Set(a.plan.map(n=>n.id)));
   const crossed=new Set(),orderEnd=new Set();
   let toggles=0,priorOpen=s.doors[0].open,peakAttempts=0;
   toggling(s);
   // Thirty seconds of the real 60Hz motor. Unfinished is now a HARD gate.
   for(let i=0;i<1800;i++){
    stepSession(s,1/60);
    const open=s.doors[0].open;
    if(open!==priorOpen){toggles++;priorOpen=open;}
    for(const [j,a] of squad.entries()){
     assert.ok(Number.isFinite(a.p.x+a.p.y),'invalid actor '+a.id);
     assert.ok(a.plan.every(n=>initial[j].has(n.id)),
      'authored plan mutated: '+a.id);
     assert.ok((a.doorTraversal?.maneuverAttempts??0)<=4,
      'unbounded corrective re-selection for '+a.id);
     peakAttempts=Math.max(peakAttempts,
      a.doorTraversal?.maneuverAttempts??0);
     if(a.p.y>278)crossed.add(a.id);
     if(!a.plan.length)orderEnd.add(a.id);
    }
    if(orderEnd.size===4)break;
   }
   const details=squad.map(a=>({id:a.id,p:a.p,orders:a.plan.length,
    blocker:a.lastBlocker,phase:a.doorTraversal?.phase,
    maneuver:a.doorTraversal?.maneuver}));
   assert.ok(toggles<=1,'hinge ping-pong '+id+': '+JSON.stringify(details));
   assert.equal(crossed.size,4,'crossing '+id+': '+JSON.stringify(details));
   assert.equal(orderEnd.size,4,'completion '+id+': '+JSON.stringify(details));
   assert.equal(s.doors[0].open,true);
  }finally{activateSite(null);}
 });
}
test('D2-D3 locked and wedged doors remain solid',()=>{
 for(const id of ['locked','wedged']){
  const s=newSession(0,undefined,'full-view','small','hold',
   doorRangeSite(id),{enableCivilians:false});
  try{
   prepareDoorRangeCase(s,id);
   const squad=team(s).slice(0,4);
   const accepted=planSquadEntry(s,'ENTRY');
   if(accepted){
    toggling(s);
    for(let i=0;i<540;i++)stepSession(s,1/60);
   }
   assert.ok(squad.every(a=>a.p.y<278),
    id+' unexpectedly allows physical penetration');
  }finally{activateSite(null);}
 }
});
