import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planDoor,selectDeployment,toggling,
 stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {openingFootwork} from '../src/breach-door-opening-footwork.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {openerThreatensLeaf} from '../src/breach-door-opening-stance.ts';
import {doorWouldStrikeActors} from '../src/breach-door.ts';

const cases=[
 {seed:14,mission:'hold',entry:'FRONT'},
 {seed:14,mission:'hold',entry:'SERVICE'},
 {seed:12,mission:'intel',entry:'FRONT'},
 {seed:12,mission:'intel',entry:'SERVICE'},
 {seed:23,mission:'rescue',entry:'FRONT'},
 {seed:23,mission:'rescue',entry:'SERVICE'}
];
for(const {seed,mission,entry} of cases){
 test(`EQA3.2 actual ${seed}/${mission}/${entry} can reach its handle, clear stance and physically OPEN`,()=>{
  const site=generateSite(seed,'small',undefined,{
   mission,enableIncidentIntent:true});
  const s=newSession(0,seed,'floor-plan','small',mission,site,
   {enableCivilians:true});
  try{
   if(entry!=='FRONT')assert.equal(selectDeployment(s,entry),true);
   const actor=team(s)[0],door=s.doors.find(d=>d.id===entry);
   assert.ok(door,'expected real generated portal');
   assert.equal(door.open,false,'the test must truly start from CLOSED');
   assert.equal(door.locked,false,'not a lockbreaking or hidden-unlock test');
   const orig={...actor.p};
   assert.equal(planDoor(s,actor.id,entry,'open'),true,
    'player-authorable, knowledge-gated handle approach must be legal');
   assert.equal(s.phase,'planning');
   assert.equal(door.open,false,'authored order alone never opens it');
   toggling(s);
   let physicalFraction=0;
   let actionStartedAt=null;
   let openedAt=null;
   for(let i=0;i<20*30&&s.phase==='running';i++){
    stepSession(s,1/30);
    physicalFraction=Math.max(physicalFraction,door.openFraction??0);
    if(actionStartedAt===null&&actor.actionTimer>.05)
      actionStartedAt=s.seconds;
    if(openedAt===null&&door.open)openedAt=s.seconds;
    if(door.open&&physicalFraction>=.72)break;
   }
   assert.ok(Number.isFinite(actor.p.x)&&Number.isFinite(actor.p.y));
   assert.equal(actor.failedOrders,0,
    'the corrective stance should not cancel a legal OPEN');
   const foot=a=>a.plan[0]?.kind==='door'?openingFootwork(a,door.id,a.plan[0].id,'stance'):null;
   const stance=foot(actor)?.target??null;
   const peer=team(s).filter(b=>b.id!==actor.id&&b.health>0).map(b=>({
     id:b.id,p:b.p,distStance:stance?Math.hypot(b.p.x-stance.x,b.p.y-stance.y):null
   }));
   const trace={p:actor.p,nav:actor.nav.slice(0,8),peer,
     stanceSweeepClear:stance?sweptBodyClear(actor.p,stance,s.doors,8,
        sessionWorldGeometry(s)):null,
     currentWouldStrike:openerThreatensLeaf(door,actor.p),
     stanceWouldStrike:stance?openerThreatensLeaf(door,stance):null,
     originalDoorCenter:{x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2},
     authoredNode:actor.plan[0],routeGoalKey:actor.routeGoalKey,
     openingFootwork:foot(actor),motorPause:actor.motorPause,
     actionTimer:actor.actionTimer,velocity:actor.velocity,
     blocker:actor.lastBlocker,blockedTime:actor.blockedTime,
     recoveryAttempts:actor.recoveryAttempts};
   assert.ok(actionStartedAt!==null,
    'the door action must start instead of oscillating forever with timer=0: '+JSON.stringify(trace));
   assert.ok(openedAt!==null,'real hinge must be asked to open by GO, never setup');
   assert.ok(physicalFraction>=.72,
    `swept hinge should clear without body ghosting; max fraction ${physicalFraction}`);
   assert.ok(Math.hypot(actor.p.x-orig.x,actor.p.y-orig.y)<125,
    'ordinary bounded handle footwork never teleports actor across site');
  }finally{activateSite(null);}
 });
}
