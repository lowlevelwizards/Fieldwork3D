import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinatePassage} from '../src/breach-passage-coordinator.ts';
import {planDoorSchedule} from '../src/breach-passage-plan.ts';
import {activeDoorCrossingIntent,operatorCrossingDoor,
 incidentalCloseWouldBlockTeammate}
 from '../src/breach-door-pressure-arbitration.ts';

const p=(x,y)=>({x,y});
const door={id:'THRESHOLD',a:p(80,100),b:p(140,100),
 kind:'hinged',open:true,openFraction:1};
const actor=(id,x,y,toY=40)=>({
 id,side:'blue',health:4,p:p(x,y),blockedTime:0,
 passageWaitSeconds:0,motorPause:null,nav:[],
 plan:[{kind:'move',id:1,p:p(x,toY)}]
});
const rank=(a,n)=>({actorId:a.id,doorId:door.id,fromSide:1,rank:n,eta:n+1});
const world=actors=>({operators:actors,doors:[door],seconds:0,events:[]});

test('D1 cohesive: rank does not reserve an empty parallel doorway lane',()=>{
 const lead=actor('lead',96,125),following=actor('follow',124,142);
 const s=world([lead,following]);
 const schedule=new Map([[lead.id,[rank(lead,0)]],
   [following.id,[rank(following,1)]]]);
 const proposal=p(124,138);
 const move=coordinatePassage(s,following,proposal,schedule);
 assert.deepEqual(move.move,proposal,
   'an actual free lateral corridor must not be blocked by projected leader depth');
 assert.equal(move.hold,false);
 assert.equal(move.rank,1,'GO priority must remain stable');
});
test('D1 cohesive: same-centerline queue still retains its compact body gap',()=>{
 const lead=actor('lead',110,125),following=actor('follow',110,145);
 const s=world([lead,following]);
 const schedule=new Map([[lead.id,[rank(lead,0)]],
   [following.id,[rank(following,1)]]]);
 const r=coordinatePassage(s,following,p(110,141),schedule);
 assert.deepEqual(r.move,following.p,'do not crush a slower actual leader');
 assert.equal(r.hold,true);
});
test('D1 cohesive: stopped completed order cannot retain an invisible queue claim',()=>{
 const stopped=actor('stopped',96,91);
 stopped.plan=[];
 const following=actor('follow',124,125);
 const s=world([stopped,following]);
 const schedule=new Map([[stopped.id,[rank(stopped,0)]],
   [following.id,[rank(following,1)]]]);
 const move=coordinatePassage(s,following,p(124,122),schedule);
 assert.deepEqual(move.move,p(124,122));
 assert.equal(move.hold,false);
});
test('D1 cohesive: WAIT before a crossing affects projected ranks, no execution mutation',()=>{
 const early=actor('early',110,84,170),later=actor('later',111,74,170);
 early.plan.unshift({id:91,kind:'wait',p:p(110,84),duration:2});
 const schedule=planDoorSchedule([early,later],[door],(_,to)=>[to]);
 assert.equal(schedule.get(later.id)?.[0]?.rank,0);
 assert.equal(schedule.get(early.id)?.[0]?.rank,1);
 assert.equal(early.plan[0].kind,'wait');
 const s=world([early,later]);
 assert.equal(coordinatePassage(s,later,p(111,78),schedule).hold,false);
});
test('D1 cohesive: all hinge views use current authored crossing, not stale remote episode',()=>{
 const first=actor('one',110,120,40);
 const other={...door,id:'OTHER',a:p(80,220),b:p(140,220)};
 first.doorTraversal={doorId:'OTHER',authoredOrderId:1,destination:p(110,300)};
 assert.equal(operatorCrossingDoor(first,door),true,
   'different door episode must not override the current goal');
 assert.equal(activeDoorCrossingIntent(first,door,true),true);
 assert.equal(incidentalCloseWouldBlockTeammate([first],first,door),true);
 first.plan=[{kind:'wait',id:2,p:p(110,120),duration:2}];
 assert.equal(activeDoorCrossingIntent(first,door,true),false);
 assert.equal(incidentalCloseWouldBlockTeammate([first],first,door),false);
});
