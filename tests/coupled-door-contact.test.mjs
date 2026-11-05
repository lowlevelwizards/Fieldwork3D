import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
import {initDoor,advanceDoor,pushDoor,pressDoorOnBodyAttempt,
 PUSHED_OPEN_LIMIT} from '../src/breach-door.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';

const sample=(hinge='a',swing=-1)=>{
 const d=initDoor({id:'PUSH',a:{x:290,y:260},b:{x:332,y:260},
   hinge,swing,kind:'hinged',open:true,openedAt:0},0);
 d.openFraction=1;d.angularVelocity=0;d.pushTarget=1;
 return d;
};
const distance=(p,leaf)=>pointToSegment(p,leaf);
function aRealPressureStep(door){
 const current=doorLeafSegment(door),next=doorLeafSegment({
   ...door,openFraction:1.08
 });
 const mid={x:(current.a.x+current.b.x)/2,
   y:(current.a.y+current.b.y)/2};
 const len=Math.hypot(current.b.x-current.a.x,current.b.y-current.a.y);
 const normal={x:-(current.b.y-current.a.y)/len,
   y:(current.b.x-current.a.x)/len};
 const point=(sign)=>({x:mid.x+normal.x*14*sign,
   y:mid.y+normal.y*14*sign});
 // Push on the side from which an increasing hinge angle moves AWAY.
 const candidateA=point(1),candidateB=point(-1);
 const delta=p=>distance(p,next)-distance(p,current);
 const from=delta(candidateA)>delta(candidateB)?
   candidateA:candidateB;
 const to={x:mid.x-(from.x-mid.x),y:mid.y-(from.y-mid.y)};
 return {from,to};
}
test('contact-driven hinge clears a real capsule path for either swing and hinge',()=>{
 for(const hinge of ['a','b'])for(const swing of [-1,1]){
   const door=sample(hinge,swing),{from,to}=aRealPressureStep(door);
   assert.equal(sweptBodyClear(from,to,[door]),false,
     'path must initially collide with leaf: '+hinge+','+swing);
   const contact=pressDoorOnBodyAttempt(from,to,[door],1/60,[from]);
   assert.equal(contact?.doorId,'PUSH');
   assert.equal(contact?.advanced,true,
     'hinge should yield to real capsule pressure');
   for(let i=0;i<150;i++)advanceDoor(door,1/60,[from]);
   assert.ok(door.openFraction>1.28,
     'unobstructed leaf should reach full safe hinge angle: '+door.openFraction);
   assert.ok(door.openFraction<=PUSHED_OPEN_LIMIT);
   assert.equal(sweptBodyClear(from,to,[door]),true,
     'operator must actually fit after hinge yields');
 }
});
test('no proximity magic: approaching away, held, closed and sliding doors do not push',()=>{
 const door=sample(),{from}=aRealPressureStep(door);
 const away={x:from.x+(from.x-300),y:from.y+(from.y-281)};
 const initial=door.openFraction;
 assert.equal(pressDoorOnBodyAttempt(from,away,[door],1/60,[from]),null);
 assert.equal(door.openFraction,initial);
 for(const modifier of [{heldBy:'guard'},{kind:'sliding'},
   {kind:'shutter'},{open:false,openFraction:0}]){
   const d={...door,...modifier};
   assert.equal(pressDoorOnBodyAttempt(from,{x:300,y:281},[d],
     1/60,[from]),null);
 }
});
test('door reaches physically allowed swing without a false fixed-angle stop',()=>{
 const door=sample();
 const site={seed:1,doors:[door],walls:[
   {a:{x:95,y:260},b:{x:290,y:260}},
   {a:{x:332,y:260},b:{x:520,y:260}}
 ],cover:[],bounds:{minX:0,minY:0,maxX:650,maxY:540}};
 activateSite(site);
 try{
   assert.equal(pushDoor(door,3),true);
   for(let i=0;i<180;i++)advanceDoor(door,1/60);
   assert.ok(door.openFraction>1.3,
     'should pass former arbitrary 112 degree stopping point');
   assert.ok(door.openFraction<=PUSHED_OPEN_LIMIT,
     'leaf must never exceed its mechanical swing cap');
 }finally{activateSite(null);}
});
test('door never moves through an obstructing real physical actor',()=>{
 const door=sample(),{from}=aRealPressureStep(door);
 const prev=door.openFraction;
 // Contact may move the hinge away from the pusher, but should not
 // invalidate the standing operator capsule in the opposite sweep.
 const panel=doorLeafSegment({...door,openFraction:1.18});
 const blocker={x:(panel.a.x+panel.b.x)*.5,
   y:(panel.a.y+panel.b.y)*.5};
 pressDoorOnBodyAttempt(from,{x:300,y:281},[door],1/60,[from,blocker]);
 for(let i=0;i<90;i++)advanceDoor(door,1/60,[from,blocker]);
 assert.ok(door.openFraction>=prev);
 assert.ok(door.openFraction<=PUSHED_OPEN_LIMIT);
});
