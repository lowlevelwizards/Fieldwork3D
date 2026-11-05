import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,doorLeafSegment,pointToSegment,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
import {initDoor,hingeSweepNeighborhood,doorSwingBlocked,
 pressDoorOnBodyAttempt,PUSHED_OPEN_LIMIT}
 from '../src/breach-door.ts';

const make=(hinge='a',swing=-1)=>{
 const d=initDoor({id:'R8',a:{x:290,y:260},b:{x:332,y:260},
  hinge,swing,kind:'hinged',open:true,openedAt:0},0);
 d.openFraction=0;d.angularVelocity=0;
 return d;
};
const site=d=>({
 seed:801,doors:[d],walls:[],cover:[],
 bounds:{minX:0,minY:0,maxX:640,maxY:540}
});
test('R8a: broad phase discards distant clutter before continuous hinge sweep',()=>{
 for(const hinge of ['a','b']){
  const d=make(hinge);
  const farCover=Array.from({length:160},(_,i)=>({
   x:450+(i%20)*8,y:400+Math.floor(i/20)*8,w:6,h:6
  }));
  const farWalls=Array.from({length:70},(_,i)=>({
   a:{x:490+i*2,y:100},b:{x:490+i*2,y:320}
  }));
  const results=hingeSweepNeighborhood(d,farWalls,farCover);
  assert.equal(results.walls.length,0);
  assert.equal(results.cover.length,0);
 }
});
test('R8a: near actor and thin fixture still block the swept hinge',()=>{
 const d=make();
 const fixture={x:316,y:286,w:4,h:4};
 const zone=hingeSweepNeighborhood(d,[],[fixture]);
 assert.deepEqual(zone.cover,[fixture]);
 activateSite({...site(d),cover:[fixture]});
 try{
  assert.equal(doorSwingBlocked(d,1.2),true);
  const actor={x:316,y:286};
  assert.equal(doorSwingBlocked(d,1.2,[actor]),true);
 }finally{activateSite(null);}
});
test('R8a: a far fixture never produces false stops',()=>{
 const d=make();
 const far={x:550,y:400,w:20,h:20};
 activateSite({...site(d),cover:[far]});
 try{assert.equal(doorSwingBlocked(d,.9),false);}
 finally{activateSite(null);}
});
test('R8b: sustained shoulder pressure does not stack impulsive kicks',()=>{
 const d=make();d.openFraction=1;d.pushTarget=1;
 const leaf=doorLeafSegment(d),next=doorLeafSegment({...d,openFraction:1.08});
 const mid={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 const vx=leaf.b.x-leaf.a.x,vy=leaf.b.y-leaf.a.y;
 const length=Math.hypot(vx,vy);
 const normal={x:-vy/length,y:vx/length};
 const one={x:mid.x+normal.x*14,y:mid.y+normal.y*14};
 const two={x:mid.x-normal.x*14,y:mid.y-normal.y*14};
 const gapDelta=p=>pointToSegment(p,next)-pointToSegment(p,leaf);
 const from=gapDelta(one)>gapDelta(two)?one:two;
 const to={x:mid.x*2-from.x,y:mid.y*2-from.y};
 const first=pressDoorOnBodyAttempt(from,to,[d],1/60,[from]);
 assert.equal(first?.doorId,d.id);
 assert.equal(first?.advanced,true);
 const velocity=d.angularVelocity??0;
 const again=pressDoorOnBodyAttempt(from,to,[d],1/60,[from]);
 assert.equal(again?.doorId,d.id);
 assert.ok((d.angularVelocity??0)<=velocity+.4,
  'constant shoulder pressure should not inject another impact pulse');
 assert.equal(d.pushTarget,PUSHED_OPEN_LIMIT);
 assert.ok((d.openFraction??0)>1);
 assert.ok((d.openFraction??0)<=PUSHED_OPEN_LIMIT);
 assert.ok(pointToSegment(from,doorLeafSegment(d))>=OPERATOR_RADIUS,
  'door contact never tunnels into the pressing operator');
});
