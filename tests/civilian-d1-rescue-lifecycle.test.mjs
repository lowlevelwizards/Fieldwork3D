import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,toggling,stepSession,planCivilianInteraction}
 from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {applyCivilianBulletHit} from '../src/breach-civilian-ballistics.ts';
import {stepCivilianMovement} from '../src/breach-civilian-movement.ts';

const rescue=(p)=>createCivilian({
 id:'civ:d1:rescue',role:'rescue',persona:'cautious',
 activity:'waiting',position:p,heading:0,roomId:'r',appearanceSeed:9,
 isRescueTarget:true
});
test('E5-D1 rescue requires SECURE then authored FOLLOW, not mere proximity',()=>{
 const s=newSession(),operator=team(s)[0];
 // The interaction must be genuinely visible, not outside the operator's cone.
 operator.heading=0;operator.weaponYaw=0;
 const civil=rescue({x:operator.p.x+14,y:operator.p.y});
 s.civilians.push(civil);
 s.missionType='rescue';s.mission='secure';
 s.rescue={p:{...civil.p},following:null,trail:[]};
 s.scenario.objective={...civil.p};
 s.scenario.extract={x:3000,y:3000};
 toggling(s);
 stepSession(s,1/60);
 assert.equal(s.mission,'secure','proximity must not secure a real person');
 assert.equal(s.rescue.following,null);
 toggling(s);
 assert.equal(planCivilianInteraction(s,operator.id,civil.id,'secure'),true);
 toggling(s);stepSession(s,1/60);
 assert.equal(civil.state,'compliant');
 assert.equal(s.mission,'extract');
 assert.equal(s.rescue.following,null,'SECURE alone cannot establish escort');
 for(let i=0;i<5;i++)stepSession(s,1/60);
 assert.equal(s.rescue.following,null,'nearby squad cannot auto-join');
 toggling(s);
 assert.equal(planCivilianInteraction(s,operator.id,civil.id,'follow'),true);
 toggling(s);stepSession(s,1/60);
 assert.equal(s.rescue.following,operator.id);
 assert.equal(civil.following,operator.id);
 const before={...civil.p};
 operator.p={x:before.x+250,y:before.y};
 stepSession(s,1/60);
 assert.equal(s.rescue.following,null);
 assert.equal(civil.following,null);
 assert.ok(Math.hypot(civil.p.x-before.x,civil.p.y-before.y)<2);
 operator.p={x:before.x-14,y:before.y};
 stepSession(s,1/60);
 assert.equal(s.rescue.following,null,
   'returning physically nearby cannot silently reattach FOLLOW');
});
test('E5-D1 injured followers remain mobile but slow; no position snapping',()=>{
 const civil=rescue({x:0,y:0});
 civil.following='rook';civil.state='escorted';
 civil.goal={x:60,y:0};
 applyCivilianBulletHit(civil,1);
 assert.equal(civil.health,1);
 assert.equal(civil.state,'escorted');
 stepCivilianMovement(civil,1.1,.5,()=>true,()=>false);
 assert.ok(civil.p.x>0&&civil.p.x<=11.001,
   'injured walker uses 22 world units per second');
 const close=rescue({x:0,y:0});
 close.following='rook';close.state='escorted';close.goal={x:8,y:0};
 stepCivilianMovement(close,0.5,1/60,()=>true,()=>false);
 assert.ok(close.p.x>0&&close.p.x<1,
   'near route nodes must not teleport ahead of the fixed tick');
 applyCivilianBulletHit(civil,2);
 const stopped={...civil.p};
 stepCivilianMovement(civil,2.1,1,()=>true,()=>false);
 assert.deepEqual(civil.p,stopped);
 assert.equal(civil.following,null);
});
