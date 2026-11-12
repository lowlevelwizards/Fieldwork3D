import test from 'node:test';
import assert from 'node:assert/strict';
import {initDoor,advanceDoor,pressDoorOnBodyAttempt,
 PUSHED_OPEN_LIMIT,handlePoint} from '../src/breach-door.ts';
import {operatorCrossingDoor} from '../src/breach-door-pressure-arbitration.ts';
import {doorLeafSegment,pointToSegment} from '../src/breach-core.ts';

const pt=(x,y)=>({x,y});
const newDoor=(hinge='a',swing=-1)=>{
 const door=initDoor({id:'ENTRY',a:pt(290,260),b:pt(332,260),
  kind:'hinged',open:true,openedAt:0,hinge,swing},0);
 door.openFraction=1;door.angularVelocity=0;door.pushTarget=1;
 return door;
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function pressureFaces(door){
 const leaf=doorLeafSegment(door),future=doorLeafSegment({
  ...door,openFraction:1.08});
 const mid=pt((leaf.a.x+leaf.b.x)/2,(leaf.a.y+leaf.b.y)/2);
 const length=distance(leaf.a,leaf.b);
 const normal=pt(-(leaf.b.y-leaf.a.y)/length,
  (leaf.b.x-leaf.a.x)/length);
 const probe=sign=>pt(mid.x+normal.x*14*sign,
  mid.y+normal.y*14*sign);
 const a=probe(1),b=probe(-1);
 const away=p=>pointToSegment(p,future)-pointToSegment(p,leaf);
 const opening=away(a)>away(b)?a:b,closing=opening===a?b:a;
 return {opening:{from:opening,to:closing},
  closing:{from:closing,to:opening}};
}
const actor=(from,goal,kind='move')=>({
 id:'rook',side:'blue',health:4,p:from,blockedTime:0,
 nav:[goal],plan:[{id:1,kind,p:goal,doorId:'ENTRY',method:'close'}]
});

test('R7.2a outward crossing can physically pull open from closing face',()=>{
 for(const hinge of ['a','b'])for(const swing of [-1,1]){
  const door=newDoor(hinge,swing);
  const {closing}=pressureFaces(door);
  const centerY=(door.a.y+door.b.y)/2;
  const from=closing.from;
  const goal=pt(311,from.y<centerY?350:170);
  const crossing=actor(from,goal);
  assert.equal(operatorCrossingDoor(crossing,door),true);
  const contact=pressDoorOnBodyAttempt(closing.from,closing.to,
   [door],1/60,[closing.from],{
    preferOpening:()=>operatorCrossingDoor(crossing,door),
    deferClosing:()=>true
   });
  assert.equal(door.open,true,
   'crossing must not close hinge '+hinge+' '+swing);
  assert.ok(contact===null||contact.handAssist===true,
   'wrong-face contact is either a real hand assist or a suppressed close');
  if(contact?.handAssist){
   for(let i=0;i<120;i++)advanceDoor(door,1/60,[closing.from]);
   assert.ok(door.openFraction>=1,
    'handle assistance must not force the panel into the operator');
  }
 }
});
test('R7.2a ordinary contact and explicit CLOSE remain physically meaningful',()=>{
 const door=newDoor(),{closing}=pressureFaces(door);
 const idle=actor(closing.from,pt(closing.from.x,closing.from.y+1));
 assert.equal(operatorCrossingDoor(idle,door),false);
 const explicit=actor(closing.from,pt(311,170),'door');
 assert.equal(operatorCrossingDoor(explicit,door),false);
 const pressure=pressDoorOnBodyAttempt(closing.from,closing.to,
  [door],1/60,[closing.from],{
   preferOpening:()=>false,deferClosing:()=>false});
 assert.equal(pressure?.doorId,door.id);
 assert.equal(door.open,false,
  'a body not crossing the threshold can still push the leaf closed');
});
test('R7.2a sustained pressure can attain ~137 degrees if no physical block',()=>{
 const door=newDoor();
 assert.ok(PUSHED_OPEN_LIMIT>1.5);
 door.pushTarget=PUSHED_OPEN_LIMIT;
 for(let i=0;i<150;i++)advanceDoor(door,1/60);
 assert.ok(door.openFraction>1.46,'door opens more than old 118-degree cap');
 assert.ok(door.openFraction<=PUSHED_OPEN_LIMIT);
 assert.ok(Number.isFinite(handlePoint(door).x));
});
