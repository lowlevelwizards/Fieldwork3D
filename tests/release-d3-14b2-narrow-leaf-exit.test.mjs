import test from 'node:test';
import assert from 'node:assert/strict';
import {findBoundedNarrowLeafExit,claimNarrowLeafExitProbe,
 ownNarrowExitWaypoints,preciseNarrowExitWaypoint}
 from '../src/breach-squeeze-leaf-exit.ts';
import {localDetourWaypointTolerance}
 from '../src/breach-motor-local-detour.ts';
import {releaseEmbeddedMotorActor}
 from '../src/breach-locomotion-clearance.ts';
const p=(x,y)=>({x,y}),d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('D3.14B2 narrow escape: every local leg needs a real oriented sweep',()=>{
 const start=p(298.73,457.2),next=p(296,496),goal=p(468,520.5);
 let attempts=0;
 // A deterministic tight aperture: first direct chord blocked; the
 // only legal short stage hugs a narrow corridor. This doesn't replace
 // the existing real-world motor and doesn't invent a remote GO.
 const narrow=(a,b)=>{
  attempts++;
  if(d(a,b)>4.01)return false;
  return b.y>=a.y-.02&&b.x>=a.x-.02&&b.x<330&&b.y<500;
 };
 const full=()=>false;
 const stage=findBoundedNarrowLeafExit(start,goal,next,narrow,full);
 assert.deepEqual(stage,[],
  'a corridor that cannot physically rejoin the original nav has no route');
 assert.ok(attempts<3000,'cold candidate exploration must be bounded');
});

test('D3.14B2 cannot turn any short stage into authored GO completion',()=>{
 const start=p(10,10),next=p(10,35),goal=p(300,300);
 let checks=0;
 const narrow=(a,b)=>{
  checks++;
  return d(a,b)<=4.05&&(b.y<=a.y||b.x<=a.x);
 };
 const full=(a,b)=>d(a,b)<2;
 const stage=findBoundedNarrowLeafExit(start,goal,next,narrow,full);
 assert.deepEqual(stage,[],'no physically joined tail: no stage returned');
 assert.ok(checks<3000);
});

test('D3.14B2 probes do not repeat on an unchanged generated entry',()=>{
 const a={plan:[{kind:'move',id:81,entryDoorId:'D9'}],p:p(298,457)};
 const goal=p(468,520);
 assert.equal(claimNarrowLeafExitProbe(a,'D9',goal,1.55),true);
 assert.equal(claimNarrowLeafExitProbe(a,'D9',goal,1.55),false);
 a.p=p(299,457);
 assert.equal(claimNarrowLeafExitProbe(a,'D9',goal,1.55),false);
 a.p=p(337,457);
 assert.equal(claimNarrowLeafExitProbe(a,'D9',goal,1.55),true);
 a.plan[0]={kind:'move',id:82,entryDoorId:'D9'};
 assert.equal(claimNarrowLeafExitProbe(a,'D9',goal,1.55),true);
 a.plan[0]={kind:'move',id:83,entryDoorId:'OTHER'};
 assert.equal(claimNarrowLeafExitProbe(a,'D9',goal,1.55),false);
});

test('D3.14B2 exact staged waypoint tolerance never affects normal nav',()=>{
 const a={plan:[{kind:'move',id:81,entryDoorId:'D9'}],p:p(298,457)};
 const stages=[p(295,454),p(292,452),p(288,451)];
 ownNarrowExitWaypoints(a,stages);
 assert.equal(preciseNarrowExitWaypoint(a,stages[0]),true);
 assert.equal(localDetourWaypointTolerance(a,stages[0]),.85);
 assert.equal(localDetourWaypointTolerance(a,stages[1]),.85);
 assert.equal(localDetourWaypointTolerance(a,p(296,496)),3,
  'original transient nav must use its original 3-unit tolerance');
});

test('M2.10: repeated witnessed leaf escape gets at most three spaced cold probes',()=>{
 const a={plan:[{kind:'move',id:91,entryDoorId:'FRONT'}],p:p(420,605)};
 const goal=p(283,585);
 assert.equal(claimNarrowLeafExitProbe(a,'FRONT',goal,1.05,10),true);
 a.p=p(425,605);
 assert.equal(claimNarrowLeafExitProbe(a,'FRONT',goal,1.05,15),false);
 assert.equal(claimNarrowLeafExitProbe(a,'FRONT',goal,1.26,16),true);
 a.p=p(416,604);
 assert.equal(claimNarrowLeafExitProbe(a,'FRONT',goal,1.26,17),false);
 assert.equal(claimNarrowLeafExitProbe(a,'FRONT',goal,1.26,21),true);
 a.p=p(440,604);
 assert.equal(claimNarrowLeafExitProbe(a,'FRONT',goal,1.45,26),false);
});

test('M2.10: legitimate narrow profile cannot be reset by early full-width wall rescue',()=>{
 const wall={a:p(8, -50),b:p(8, 50)};
 const nearWall=(point,r,callback)=>
  Math.abs(point.x-8)<r+1&&callback(wall,0);
 const world={
  someWallNearPoint:nearWall,
  someCoverNearPoint:()=>false,
  passable:(point,r=8)=>Math.abs(point.x-8)>=r+1&&
    Math.abs(point.x)<100&&Math.abs(point.y)<100,
  cover:[],walls:[wall],bounds:{minX:-100,minY:-100,maxX:100,maxY:100}
 };
 const actor={p:p(0,0),priorP:p(0,0),squeeze:true,
  plan:[{kind:'move',id:81,entryDoorId:'FRONT',p:p(0,30)}],
  nav:[p(0,8)],blockedTime:2,squeezeTime:1,velocity:0,retryRouteAt:0};
 ownNarrowExitWaypoints(actor,[actor.nav[0]]);
 const result=releaseEmbeddedMotorActor(actor,p(0,30),[],1/60,world);
 assert.equal(result,false,'no full-body rescue on genuine narrow stage');
 assert.deepEqual(actor.nav,[p(0,8)]);
 assert.deepEqual(actor.p,p(0,0),'no invented displacement');
 // Without a certified narrow stage, original embedded-body safety owns
 // real collision and may issue its existing swept rescue.
 actor.nav=[p(0,9)];
 const recovery=releaseEmbeddedMotorActor(actor,p(0,30),[],1/60,world);
 assert.equal(recovery,true);
 assert.deepEqual(actor.nav,[]);
});

test('M2.10d: extended leaf-tip turns require exact center before heading changes',()=>{
 const a={plan:[{kind:'move',id:92,entryDoorId:'FRONT'}],p:p(0,0)};
 const stages=[p(8,4),p(16,8)];
 ownNarrowExitWaypoints(a,stages,true);
 assert.equal(localDetourWaypointTolerance(a,stages[0]),.18);
 assert.equal(localDetourWaypointTolerance(a,stages[1]),.18);
 assert.equal(localDetourWaypointTolerance(a,p(30,8)),3);
});

test('M2.10f: arrived narrow leaf stage checks next owned stride BEFORE full-body rescue',()=>{
 const wall={a:p(8,-50),b:p(8,50)};
 const world={
  someWallNearPoint:(point,r,callback)=>
    Math.abs(point.x-8)<r+1&&callback(wall,0),
  someCoverNearPoint:()=>false,
  passable:(point,r=8)=>Math.abs(point.x-8)>=r+1&&
    Math.abs(point.x)<100&&Math.abs(point.y)<100,
  cover:[],walls:[wall],
  bounds:{minX:-100,minY:-100,maxX:100,maxY:100}
 };
 const a={p:p(0,0),priorP:p(0,0),squeeze:true,
  plan:[{kind:'move',id:82,entryDoorId:'FRONT',p:p(0,30)}],
  nav:[p(0,0),p(0,8)],blockedTime:0,squeezeTime:1,
  velocity:15,retryRouteAt:0};
 ownNarrowExitWaypoints(a,a.nav,true);
 assert.equal(releaseEmbeddedMotorActor(a,p(0,30),[],1/60,world),false,
  'already reached stage must not erase verified next narrow step');
 assert.deepEqual(a.nav,[p(0,0),p(0,8)]);
 assert.deepEqual(a.p,p(0,0));
});
