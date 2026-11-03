import test from 'node:test';
import assert from 'node:assert/strict';
import {crossingDoor,passageOwner,passageWait} from '../src/breach-passage.ts';

const door={id:'HALL',a:{x:40,y:100},b:{x:88,y:100},open:true};
const actor=(id,y,goalY=150,active=true,side='blue')=>({
 id,side,p:{x:64,y},goal:active?{x:64,y:goalY}:null,
 health:4,blockedTime:0,active,
});
test('nearest moving unit, not roster order, gets the initial doorway lease',()=>{
 const back=actor('rook',68),next=actor('moss',89),middle=actor('ash',76);
 const leases={};
 // Intentionally put the farthest unit first in the array.
 assert.equal(passageOwner(door,[back,middle,next]),'moss');
 assert.equal(passageWait(back,[door],[back,middle,next],leases,1),true);
 assert.equal(passageWait(next,[door],[back,middle,next],leases,1),false);
 assert.equal(passageWait(middle,[door],[back,middle,next],leases,1),true);
 assert.equal(leases['blue:HALL'].actorId,'moss');
});
test('owner exits, next advances; a third and fourth can follow',()=>{
 const units=[
  actor('one',89),actor('two',80),actor('three',72),actor('four',65)
 ];
 const leases={};
 const allowed=()=>units.filter(a=>!passageWait(a,[door],units,leases,2)).map(a=>a.id);
 assert.deepEqual(allowed(),['one']);
 units[0].p.y=113;
 // The follower can now advance with a full body gap, even while the lead
 // operator is still at the threshold rather than deep inside the room.
 assert.deepEqual(allowed(),['one','two']);
 // Beyond the 14-unit body-clearance plane, the old owner releases.
 units[0].p.y=120;
 assert.deepEqual(allowed(),['one','two']); // one no longer seeks crossing
 units[1].p.y=120;
 assert.deepEqual(allowed(),['one','two','three']);
 units[2].p.y=120;
 assert.deepEqual(allowed(),['one','two','three','four']);
});
test('WAIT means no reservation even if the waiting soldier is right in the throat',()=>{
 const waiting=actor('wait',96,160,false);
 const mover=actor('go',76);
 const leases={};
 assert.equal(crossingDoor(waiting,door),false);
 assert.equal(passageWait(mover,[door],[waiting,mover],leases,1),false);
 assert.equal(leases['blue:HALL'].actorId,'go');
});
test('actor heading toward nearby door action staging without crossing does not claim passage',()=>{
 const staging=actor('open',77,80);
 assert.equal(crossingDoor(staging,door),false);
 assert.equal(crossingDoor(actor('enter',77),door),true);
});
test('a continuing owner is not preempted by a follower moving closer mid-crossing',()=>{
 const lead=actor('lead',84),follower=actor('follower',73);
 const leases={};
 assert.equal(passageWait(lead,[door],[lead,follower],leases,1),false);
 lead.p.y=94;follower.p.y=89;
 assert.equal(passageWait(follower,[door],[lead,follower],leases,1.1),true);
 assert.equal(leases['blue:HALL'].actorId,'lead');
});
test('opposing side cannot steal a friendly passage lease',()=>{
 const friendly=actor('rook',84),hostile=actor('enemy',93,50,true,'red');
 const leases={};
 assert.equal(passageWait(friendly,[door],[hostile,friendly],leases,1),false);
 assert.equal(leases['blue:HALL'].actorId,'rook');
 assert.equal(passageWait(hostile,[door],[hostile,friendly],leases,1),false);
 assert.equal(leases['red:HALL'].actorId,'enemy');
 assert.equal(leases['blue:HALL'].actorId,'rook');
});
