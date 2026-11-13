import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {doorRangeSite} from '../src/breach-door-test-cases.ts';
import {coordinatePassage} from '../src/breach-passage-coordinator.ts';
import {chooseLeafStage,threatenedByOpeningLeaf}
 from '../src/breach-passage-leaf-stage.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {OPERATOR_RADIUS,activateSite} from '../src/breach-core.ts';
const p=(x,y)=>({x,y});
test('Q4 actual outward door session: one swept-safe stage, then a stable hold',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('outward-left'),{enableCivilians:false});
 try{
  const door=s.doors.find(d=>d.id==='ENTRY');
  assert.ok(door);
  door.open=true;door.openFraction=0;
  const [lead,follower,...rest]=team(s);
  for(const unit of rest)unit.health=0;
  lead.p=p(311,251);
  lead.plan=[{id:1,kind:'move',p:p(311,340)}];
  follower.plan=[{id:2,kind:'move',p:p(311,340)}];
  const world=sessionWorldGeometry(s);
  const slots=new Map([
   [lead.id,[{actorId:lead.id,doorId:door.id,fromSide:-1,rank:0,eta:1}]],
   [follower.id,[{actorId:follower.id,doorId:door.id,fromSide:-1,rank:1,eta:2}]]
  ]);
  const candidates=[];
  for(const x of [305,309,313,317,322])
   for(const y of [230,235,239,244])candidates.push(p(x,y));
  const where=candidates.find(candidate=>
   threatenedByOpeningLeaf(door,candidate,-1)&&
   chooseLeafStage(door,candidate,-1,(a,b)=>
    sweptBodyClear(a,b,s.doors,OPERATOR_RADIUS,world),[lead.p]));
  assert.ok(where,'real outward leaf must admit a safe local staging pocket');
  follower.p={...where};
  const before={...follower.p};
  let stageTicks=0,holdTicks=0;
  for(let i=0;i<100;i++){
   s.seconds+=1/60;
   const intended=p(follower.p.x,follower.p.y+1);
   const decision=coordinatePassage(s,follower,intended,slots);
   if(decision.reason==='stage'){
    stageTicks++;
    assert.equal(decision.hold,false);
    assert.ok(sweptBodyClear(follower.p,decision.move,s.doors,
      OPERATOR_RADIUS,world));
    follower.p={...decision.move};
   }else if(decision.hold){
    holdTicks++;
    assert.deepEqual(decision.move,follower.p);
   }
  }
  assert.ok(stageTicks>1,'perform a real bounded multi-tick correction');
  assert.ok(holdTicks>1,'settle into a stationary, rank-preserving hold');
  const span=Math.hypot(follower.p.x-before.x,follower.p.y-before.y);
  assert.ok(span<=61,'no cumulative runaway backward displacement');
  assert.ok(lead.p.y>follower.p.y,'no leapfrog past the doorway leader');
 }finally{activateSite(null);}
});
