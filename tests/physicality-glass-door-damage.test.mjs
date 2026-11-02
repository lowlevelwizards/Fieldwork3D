import test from 'node:test';
import assert from 'node:assert/strict';
import {initDoor} from '../src/breach-door.ts';
import {assessFireLane} from '../src/breach-fire-safety.ts';
test('shattered glass door keeps a physical frame but admits a projectile',()=>{
 const door=initDoor({id:'GLASS',a:{x:200,y:175},b:{x:200,y:225},
  open:false,openedAt:0,style:'glazed',glassShattered:true},0);
 const from={x:140,y:200},to={x:260,y:200};
 assert.equal(door.glassShattered,true);
 assert.equal(assessFireLane(from,26,to,26,[],[],[door]).blocker,'clear');
 assert.equal(assessFireLane(from,26,to,26,[],[],[door],[],'weapon').blocker,'door');
});
