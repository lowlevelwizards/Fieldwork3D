import test from 'node:test';
import assert from 'node:assert/strict';
import {KICK_DURATION,kickMotion,doorActionLabel} from '../src/breach-door-actions.ts';
import {initDoor,advanceDoor,pushDoor,handlePoint} from '../src/breach-door.ts';
import {LabMotionCache} from '../src/breach-lab-tracks.ts';
test('135: grounded kick reaches contact and recovers without a snap',()=>{
 const a=kickMotion(-1),early=kickMotion(.15),
  impact=kickMotion(KICK_DURATION*.56),end=kickMotion(KICK_DURATION);
 assert.equal(a.extension,0);
 assert.ok(early.extension<impact.extension);
 assert.ok(impact.contact);
 assert.ok(impact.reach>3&&impact.lift>2);
 assert.equal(end.extension,0);
 assert.equal(end.complete,true);
});
test('135: door handle follows hinge and kick accelerates into frame limits',()=>{
 const d=initDoor({id:'D',a:{x:100,y:100},b:{x:130,y:100},
   open:false,openedAt:0},1);
 const handle=handlePoint(d);
 d.open=true;pushDoor(d,2.2);
 for(let i=0;i<30;i++)advanceDoor(d,1/60);
 assert.ok(Math.hypot(handlePoint(d).x-handle.x,
   handlePoint(d).y-handle.y)>9);
 assert.ok(d.openFraction>0&&d.openFraction<=1);
 assert.equal(doorActionLabel('kick',1),'KICK');
 assert.ok(doorActionLabel('open',-1).includes('↶'));
});
test('135: kicking has an isolated deterministic lab motion track',()=>{
 const c=new LabMotionCache('kick');
 assert.ok(c.sample(.5).motion.doorAt>=0);
 assert.deepEqual(c.sample(1.1),c.sample(1.1));
});
