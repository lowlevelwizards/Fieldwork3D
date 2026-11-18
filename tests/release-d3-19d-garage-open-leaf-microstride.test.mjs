import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {OPERATOR_RADIUS,activateSite,doorLeafSegment,pointToSegment}
 from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {fullBodyMotorStrideClear,selectStackMicroCorner}
 from '../src/breach-stack-micro-corner.ts';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('D3.19D read-only: actual garage 19089932 D8 open leaf / Rook stack microstride',()=>{
 const seed=19089932;
 const site=generateSite(seed,'small',undefined,{mission:'intel'},
  {archetype:'garage'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const s=newSession(0,seed,'full-view','small','intel',quiet,
  {enableCivilians:false});
 try{
  // Exact 45s end state captured from the D3.18 independent R7 motor
  // (D3.19C workflow 44203957146). No position or collision is changed.
  const from={x:376.72624080595125,y:413.77490762918455};
  const goal={x:376.5,y:403};
  const leaf=s.doors.find(d=>d.id==='D8');
  assert.ok(leaf,'unchanged garage seed must contain real D8');
  leaf.open=true;leaf.openFraction=1.55;leaf.angularVelocity=0;
  leaf.pushTarget=1.55;
  const world=sessionWorldGeometry(s);
  const sweep=(a,b)=>sweptBodyClear(a,b,s.doors,OPERATOR_RADIUS,world);
  const proposed=selectStackMicroCorner(from,goal,sweep);
  let prior=from;
  const certified=proposed.every(node=>{
   const good=fullBodyMotorStrideClear(prior,node,sweep);
   prior=node;return good;
  });
  const witness={
   seed,actor:'rook',at:from,stackGoal:goal,
   remaining:dist(from,goal),
   openDoor:'D8',fraction:leaf.openFraction,
   actualLeafGap:pointToSegment(from,doorLeafSegment(leaf)),
   coarseDirectClear:sweep(from,goal),
   exactDirectClear:fullBodyMotorStrideClear(from,goal,sweep),
   proposal:proposed,exactProposalClear:certified,
   reachesOriginalStackGoal:proposed.length?
    dist(proposed.at(-1),goal)<.001:false
  };
  console.log('D319D_GARAGE_MOTOR_WITNESS',JSON.stringify(witness));
  assert.ok(certified,'diagnostic cannot approve an invalid microstride');
  if(proposed.length)
   assert.ok(witness.reachesOriginalStackGoal,
    'recovery must not change the generated STACK order');
 }finally{activateSite(null);}
});
