import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseMuzzleRecoveryStep,chooseFriendlyLaneStep}
 from '../src/breach-combat-reactions.ts';
import {assessFireLane,assessFriendlyLane} from '../src/breach-fire-safety.ts';
import {safetyBodyFor} from '../src/breach-friendly-safety-volume.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
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
test('real player either gets a genuinely clear near-stack shot or requests a foot correction',()=>{
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
  // The actor acquires a target with an actual point/ADS transition.
  // Evaluate a bounded fixed-tick window rather than asserting an
  // instantaneous footstep before the first aim frame is settled.
  let selected=null;
  for(let tick=0;tick<36&&s.phase==='running';tick++){
    stepSession(s,1/30);
    if(lead.fireRetreatTarget){
      selected={...lead.fireRetreatTarget};
      break;
    }
  }
  if(!selected){
    // A3.10 deliberately permits close shoulder/head-clearance firing
    // without footwork. That is preferable to a redundant sidestep,
    // provided the gun and every actual bullet stayed away from the ally.
    assert.ok(lead.shots>0,'must either fire or find a valid physical step');
    assert.equal(ally.health,4,'friendly never receives damage');
    const body=safetyBodyFor(ally);
    const outgoing=s.shots.filter(shot=>shot.shooterId===lead.id);
    assert.ok(outgoing.length>0,'shots must have real recorded muzzles');
    for(const shot of outgoing){
      assert.equal(assessFriendlyLane(initial,shot.muzzleHeight,
        shot.start,shot.muzzleHeight,[body]).blocker,'clear',
        'rigid gun must not pass through the allied body');
      assert.equal(assessFriendlyLane(shot.start,shot.muzzleHeight,
        guard.p,guard.posture==='crouch'?11:32,[body]).blocker,'clear',
        'the real muzzle-to-target projectile lane cannot intersect the teammate');
    }
    assert.deepEqual(ally.p,p(185,110),'teammate is not shoved');
    assert.deepEqual(lead.p,initial,'true safe shots require no correction');
    return;
  }
  assert.ok(Math.abs(selected.x-initial.x)<6);
  // A3.4 deliberately finds the smallest VALID real step, potentially
  // 4 or 7 units instead of the former mandatory 12+ unit detour.
  const requested=Math.abs(selected.y-initial.y);
  assert.ok(requested>=3.9&&requested<=28,
    'micro-step must be real, bounded and lateral');
  assert.deepEqual(ally.p,p(185,110),'recovery must not shove teammate');
  let moved=false;
  for(let tick=0;tick<24&&s.phase==='running';tick++){
    stepSession(s,1/30);
    moved ||=Math.abs(lead.p.y-initial.y)>1.5;
    if(moved)break;
  }
  assert.ok(moved,'the sidestep must execute through the live movement motor: '+
    JSON.stringify({from:initial,now:lead.p,goal:lead.fireRetreatTarget,
      reason:lead.fireRetreatReason,nav:lead.nav,velocity:lead.velocity,
      motorPause:lead.motorPause,lastBlocker:lead.lastBlocker,
      blockedTime:lead.blockedTime,retryRouteAt:lead.retryRouteAt,
      routeGoalKey:lead.routeGoalKey,phase:s.phase,seconds:s.seconds}));
  assert.deepEqual(ally.p,p(185,110),
    'teammate must remain stationary during a real sidestep');
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
    s.doors,sessionWorldGeometry(s).cover,sessionWorldGeometry(s).walls);
  // The old minimum-clearance ring forced a backstep even when the fully
  // folded muzzle could fit. If the actual gun is clear, this is now a valid
  // close-cover firing position rather than a mandatory retreat fixture.
  assert.ok(muzzle.obstruction,'close glass should still fold the barrel');
  if(!muzzle.blocked){
    assert.ok(muzzle.compression>=0);
    return;
  }
  stepSession(s,1/30);
  assert.ok(guard.fireRetreatTarget,
    'enemy should own the same backstep action as player operator');
  assert.ok(guard.fireRetreatTarget.x<before.x,
    'enemy should step away from the window rather than crossing its barrier');
  assert.deepEqual(lead.p,fixture.spawn[0],
    'the enemy recovery may not move the opposing operator');
  let backedAway=false;
  for(let tick=0;tick<24&&s.phase==='running';tick++){
    stepSession(s,1/30);
    backedAway ||=guard.p.x<before.x-6;
    if(backedAway)break;
  }
  assert.ok(backedAway,'the red NPC must actually walk backward, not just select a destination');
 }finally{activateSite(null);}
});
