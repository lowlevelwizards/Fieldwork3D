import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
test('acceleration is fixed-step recorded and seek-order independent',()=>{
 const s=newSession(0,212),r=new MissionRecorder(),a=team(s)[0];
 for(let n=0;n<80;n++){
   s.seconds=n/60;
   a.velocity=n<15?15:n<45?47:0;
   a.p={x:a.p.x+.2,y:a.p.y};
   r.capture(s,n===79);
 }
 const expected=r.sample(.76).presentation.acceleration[a.id];
 for(const time of [1,.1,.93,.76,.5,.76])r.sample(time);
 assert.equal(r.sample(.76).presentation.acceleration[a.id],expected);
 assert.ok(Number.isFinite(expected));
});
test('real braking compresses support, idle stays still',()=>{
 const feet=[-1,1].map(s=>({position:{x:0,y:s*5.6},height:0,
   contact:true,worldYaw:0,phase:'planted'}));
 const inp=acceleration=>({velocity:45,heading:0,travelYaw:0,
  turning:0,injury:0,posture:'stand',feet,
  position:{x:0,y:0},acceleration});
 const moving=bodyFromContacts(inp(100));
 const braking=bodyFromContacts(inp(-100));
 assert.ok(braking.pelvisY<moving.pelvisY);
});
