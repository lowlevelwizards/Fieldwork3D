import test from 'node:test';
import assert from 'node:assert/strict';
import {nearMotorDoorStroke} from '../src/breach-motor-door-broadphase.ts';
import {doorLeafSegment,doorBlocksSegment,pointToSegment}
 from '../src/breach-core.ts';
import {autoDoorAtBodyContact} from '../src/breach-door.ts';
const p=(x,y)=>({x,y});
test('D3.1: 2800 seeded hinge/slider/shutter poses cannot false-reject actual leaf contact',()=>{
 let seed=0xD311;const rnd=()=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/0x100000000;
 };
 const kinds=['hinged','sliding','shutter'];
 for(let i=0;i<2800;i++){
  const a=p((rnd()-.5)*700,(rnd()-.5)*700);
  const heading=rnd()*Math.PI*2;
  const width=16+rnd()*86;
  const door={id:'D',a,b:p(a.x+Math.cos(heading)*width,
   a.y+Math.sin(heading)*width),kind:kinds[i%3],open:rnd()>.5,
   hinge:i%2?'a':'b',swing:i%2?1:-1,
   slideDirection:i%2?1:-1,openFraction:rnd()};
  const from=p(a.x+(rnd()-.5)*350,a.y+(rnd()-.5)*350);
  const to=p(from.x+(rnd()-.5)*70,from.y+(rnd()-.5)*70);
  const near=nearMotorDoorStroke(door,from,to,24);
  const actuallyNear=pointToSegment(to,doorLeafSegment(door))<24||
   doorBlocksSegment(door,{a:from,b:to});
  assert.ok(near||!actuallyNear,'false negative at case '+i);
  const nearContact=nearMotorDoorStroke(door,from,to,15);
  const physicallyClose=pointToSegment(from,doorLeafSegment(door))<15&&
   pointToSegment(to,doorLeafSegment(door))<15;
  assert.ok(nearContact||!physicallyClose,'contact false negative '+i);
 }
});
test('D3.1: distant leaves are not selected, real local door remains available',()=>{
 const far={id:'F',a:p(900,900),b:p(945,900),kind:'hinged',
  open:false,openFraction:0};
 const near={id:'N',a:p(100,80),b:p(148,80),kind:'hinged',
  open:false,openFraction:0};
 assert.equal(nearMotorDoorStroke(far,p(116,89),p(116,87),24),false);
 assert.equal(autoDoorAtBodyContact(p(116,89),p(116,87),
  [far,near]),near);
});
