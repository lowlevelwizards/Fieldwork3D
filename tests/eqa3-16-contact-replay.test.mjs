import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planCivilianInteraction,toggling,stepSession}
 from '../src/breach-game.ts';
import {civilianPhysicalityAt} from '../src/breach-encounter-physicality.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {activateSite} from '../src/breach-core.ts';
const p=(x,y)=>({x,y});
const site=()=>({
 seed:31616,name:'EQA3.16 contact witness',
 layout:'corridor',rooms:[],roomCount:0,
 walls:[],doors:[],cover:[],windows:[],enemies:[],
 entrance:p(310,220),
 spawn:[p(300,200),p(260,280),p(200,280),p(240,280)],
 objective:p(315,200),extract:p(500,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
test('EQA3.16C physical SECURE publishes short contact attention, no preview or future leak',()=>{
 const s=newSession(0,31616,'floor-plan','small','rescue',site(),
   {enableCivilians:true});
 try{
  const actor=team(s)[0],civil=s.civilians.find(c=>c.rescueTarget);
  assert.ok(civil);assert.equal(civil.lastContactPoint,null);
  actor.p=p(300,200);actor.priorP={...actor.p};
  actor.heading=Math.PI;actor.weaponYaw=Math.PI;
  civil.p=p(316,200);civil.priorP={...civil.p};
  s.mission='secure';
  assert.equal(planCivilianInteraction(s,actor.id,civil.id,'secure'),true);
  assert.equal(civil.lastContactAt,-100,'planning does not fabricate physical contact');
  toggling(s);
  for(let i=0;i<120&&civil.state!=='compliant';i++)stepSession(s,1/60);
  assert.equal(civil.state,'compliant');
  assert.ok(civil.lastContactAt>=0);
  assert.ok(Math.hypot(civil.lastContactPoint.x-actor.p.x,
    civil.lastContactPoint.y-actor.p.y)<2);
  const observed=snapshot(s);
  // The contact point is the operator's position at physical touch,
  // not an always-tracking target reference.
  const contactDirection=civilianPhysicalityAt(civil,s.seconds+.25).headYaw;
  assert.ok(Math.abs(contactDirection)>.01,
    'post-contact gaze turns toward the person who actually secured them');
  const firstPoint={...civil.lastContactPoint};
  actor.p=p(450,200);
  assert.deepEqual(civil.lastContactPoint,firstPoint);
  assert.equal(civilianPhysicalityAt(civil,s.seconds+2).headYaw,0,
    'old interaction cannot track a now-distant operator');
  applyReplayFrame(s,observed);
  assert.deepEqual(s.civilians.find(c=>c.rescueTarget).lastContactPoint,
    firstPoint);
  assert.ok(Number.isFinite(civilianPhysicalityAt(
    s.civilians.find(c=>c.rescueTarget),observed.t+.25).headYaw));
  const old=snapshot(s);
  for(const frame of old.civilians??[]){
   delete frame.lastContactAt;delete frame.lastContactPoint;
   delete frame.lastEvidenceId;
  }
  applyReplayFrame(s,old);
  const legacy=s.civilians.find(c=>c.rescueTarget);
  assert.equal(legacy.lastContactAt,-100);
  assert.equal(legacy.lastContactPoint,null);
  assert.equal(civilianPhysicalityAt(legacy,old.t+.25).headYaw,0,
    'old replay does not import present-day contact attention');
 }finally{activateSite(null);}
});
