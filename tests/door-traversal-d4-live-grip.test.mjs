import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../src/breach-game.ts';
import {doorRangeSite} from '../src/breach-door-test-cases.ts';
import {activateSite} from '../src/breach-core.ts';
import {doorHandPoint,DOOR_HAND_RELEASE_REACH}
 from '../src/breach-door-hand-contact.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
for(const id of ['outward-left','outward-right']){
 test('D4 LIVE '+id+': support hand holds true moving leaf and releases',()=>{
  const s=newSession(0,undefined,'full-view','small','hold',
   doorRangeSite(id),{enableCivilians:false});
  try{
   const squad=team(s).slice(0,4);
   assert.equal(planSquadEntry(s,'ENTRY'),true);
   toggling(s);
   const grips=new Set(),crossed=new Set();
   let maxContact=0,flips=0,prior=s.doors[0].open;
   for(let tick=0;tick<1800;tick++){
    stepSession(s,1/60);
    if(s.doors[0].open!==prior){flips++;prior=s.doors[0].open;}
    for(const actor of squad){
     if(actor.p.y>278)crossed.add(actor.id);
     const grip=actor.doorHandContact;
     if(grip?.releasedAt!==null||!grip)continue;
     const door=s.doors.find(d=>d.id===grip.doorId);
     assert.ok(door&&door.open&&!door.wedged);
     const actual=doorHandPoint(door,grip.fraction);
     const error=distance(grip.point,actual);
     assert.ok(Number.isFinite(error));
     assert.ok(error<DOOR_HAND_RELEASE_REACH+1,
      'contact target must track actual, not a stale frame');
     assert.ok(distance(actor.p,actual)<DOOR_HAND_RELEASE_REACH+1,
      'operator may not hold a door from beyond actual reach');
     assert.ok(actor.plan.length>0,'completed order retained remote hand');
     grips.add(actor.id+':'+grip.startedAt);
     maxContact=Math.max(maxContact,s.seconds-grip.startedAt);
    }
    if(squad.every(a=>a.plan.length===0))break;
   }
   assert.ok(grips.size>=1,
    'no real physical support-hand grab seen: '+id);
   assert.equal(crossed.size,4,'all operators must cross '+id);
   assert.equal(squad.filter(a=>a.plan.length===0).length,4);
   assert.ok(flips<=1,'physical hinge must not ping-pong');
   // One more fixed tick retires a completed crossing grip; the
   // animation may keep a short RELEASING record for the pose.
   stepSession(s,1/60);
   assert.ok(squad.every(a=>a.doorHandContact?.releasedAt!==null),
    'no active grip survives completed authored entry');
  }finally{activateSite(null);}
 });
}
