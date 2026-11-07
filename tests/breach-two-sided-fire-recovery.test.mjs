import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseMuzzleRecoveryStep,chooseFriendlyLaneStep}
 from '../src/breach-combat-reactions.ts';
import {assessFireLane} from '../src/breach-fire-safety.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {newSession,team,enemies,stepSession,inSight}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const p=(x,y)=>({x,y});
const baseSite={
 seed:31058,name:'FIRING LANE RECOVERY',layout:'open',training:false,
 rooms:[],roomCount:0,walls:[],doors:[],
 cover:[],windows:[],entrance:p(140,110),
 spawn:[p(150,110),p(80,180),p(80,225),p(80,270)],
 enemies:[p(235,110)],enemyHeadings:[Math.PI],
 objective:p(300,300),extract:p(100,300),
 bounds:{minX:0,minY:0,maxX:450,maxY:380}
};
const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const prepared=(site)=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 const lead=team(s)[0],guard=enemies(s)[0];
 for(const unit of s.operators){
  unit.fireCd=0;unit.reload=0;unit.magazine=12;
  unit.aim=1;unit.velocity=0;
  unit.pace='walk';unit.suppression=0;
 }
 lead.heading=Math.atan2(guard.p.y-lead.p.y,guard.p.x-lead.p.x);
 lead.weaponYaw=lead.heading;
 guard.heading=Math.atan2(lead.p.y-guard.p.y,lead.p.x-guard.p.x);
 guard.weaponYaw=guard.heading;
 lead.awareness.visualProgress[guard.id]=1;
 guard.awareness.visualProgress[lead.id]=1;
 guard.encounterReactionUntil=0;
 guard.combatChoice='engage';guard.alert='engaging';
 s.phase='running';s.started=true;
 return {s,lead,guard};
};
test('short step-back works symmetrically and never ignores collision or muzzle',()=>{
 const origin=p(0,0),aim=0;
 const movable=q=>q.x<=-14;
 const shooter=q=>q.x<=-22;
 const move=chooseMuzzleRecoveryStep(origin,aim,movable,shooter);
 assert.ok(move&&move.x<=-22&&Math.abs(move.y)<1e-7);
 assert.equal(chooseMuzzleRecoveryStep(origin,aim,()=>false,()=>true),null);
 assert.equal(chooseMuzzleRecoveryStep(origin,aim,()=>true,()=>false),null);
});
test('ally in lane triggers only a short self-sidestep, never a shot through teammate',()=>{
 const origin=p(0,0),target=p(100,0),friend=p(38,0);
 assert.equal(assessFireLane(origin,26,target,26,[],[],[],[friend]).blocker,'friendly');
 const evaluate=q=>assessFireLane(q,26,target,26,[],[],[],[friend]).blocker==='clear';
 const sidestep=chooseFriendlyLaneStep(origin,0,()=>true,evaluate);
 assert.ok(sidestep&&Math.abs(sidestep.x)<1e-7&&
  Math.abs(sidestep.y)>=12&&Math.abs(sidestep.y)<=28);
 assert.equal(chooseFriendlyLaneStep(origin,0,()=>false,evaluate),null);
 assert.equal(chooseFriendlyLaneStep(origin,0,()=>true,()=>false),null);
});
test('real player operator can request friendly-fire sidestep with orders intact',()=>{
 const fixture={...baseSite,seed:31059};
 const {s,lead,guard}=prepared(fixture);
 try{
  const ally=team(s)[1];
  ally.p=p(185,110);ally.priorP={...ally.p};
  ally.firePolicy='hold';
  assert.ok(inSight(lead,guard,s),'enemy must be a confirmed contact');
  assert.equal(assessFireLane(lead.p,26,guard.p,26,
   [],[],[],[ally.p]).blocker,'friendly');
  const initial={...lead.p};
  stepSession(s,1/30);
  assert.ok(lead.fireRetreatTarget,
   'a safe lateral target should be selected: '+JSON.stringify({
     phase:s.phase,visible:inSight(lead,guard,s),target:lead.targetId,
     firePolicy:lead.firePolicy,velocity:lead.velocity,aim:lead.aim,
     lastFireBlock:lead.lastFireBlock,lastFireRetreatAt:lead.lastFireRetreatAt,
     guard:{p:guard.p,health:guard.health},blue:{p:lead.p,health:lead.health},
     ally:ally.p,await:lead.aimInstruction,plan:lead.plan
   }));
  assert.ok(Math.abs(lead.fireRetreatTarget.x-initial.x)<6);
  assert.ok(Math.abs(lead.fireRetreatTarget.y-initial.y)>=12);
  assert.deepEqual(ally.p,p(185,110),'recovery must not shove teammate');
 }finally{activateSite(null);}
});
test('real enemy facing a shattered glass barrier seeks its own rearward muzzle clearance',()=>{
 const pane={
  id:'IW0',x:220,y:110,width:70,vertical:true,interior:true,
  style:'picture',sillHeight:0,headHeight:51
 };
 const fixture={...baseSite,seed:31060,
  spawn:[p(236,110),p(80,180),p(80,225),p(80,270)],
  enemies:[p(204,110)],enemyHeadings:[0],
  cover:[{x:220,y:110,w:10,h:70,fixture:'glass-barrier',low:true}],
  windows:[pane]
 };
 const {s,lead,guard}=prepared(fixture);
 try{
  s.windows[0].shattered=true;s.windows[0].open=true;
  const before={...guard.p},yaw=0;
  assert.ok(inSight(guard,lead,s),'opponents must actually see each other');
  const muzzle=weaponClearance({x:guard.p.x,z:guard.p.y,
    heading:guard.heading,weaponYaw:yaw,weapon:guard.weapon,
    weaponConfiguration:guard.weaponConfiguration,aim:guard.aim,
    posture:guard.posture,velocity:0,recoil:0,threatRange:near(guard.p,lead.p)},
    s.doors);
  assert.ok(muzzle.blocked,
    'test must recreate a real unusable short-stock muzzle before recovery');
  stepSession(s,1/30);
  assert.ok(guard.fireRetreatTarget,
    'enemy should own the same backstep action as player operator');
  assert.ok(guard.fireRetreatTarget.x<before.x,
    'enemy should step away from the window rather than crossing its barrier');
  assert.deepEqual(lead.p,fixture.spawn[0],
    'the enemy recovery may not move the opposing operator');
 }finally{activateSite(null);}
});
