import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS,doorLeafSegment,pointToSegment}
 from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {sweptBodyClear,bodyClear} from '../src/breach-navigation.ts';
import {fullBodyMotorStrideClear} from '../src/breach-stack-micro-corner.ts';
import {selectBlockedHingeStepback} from '../src/breach-partial-hinge-stepback.ts';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('D3.21B read-only: exact standard Garage FRONT leaf physical micro-departure sweep',()=>{
 const seed=19285501;
 const site=generateSite(seed,'standard',undefined,
  {mission:'intel'},{archetype:'garage'});
 const s=newSession(0,seed,'full-view','standard','intel',
  {...site,training:true,enemies:[],encounter:undefined},
  {enableCivilians:false});
 try{
  const door=s.doors.find(d=>d.id==='FRONT');
  assert.ok(door,'same stable Garage fixture FRONT');
  door.open=true;door.openFraction=.8587962693316564;
  door.angularVelocity=0;door.pushTarget=1;
  const from={x:121,y:273},goal={x:597.6,y:564.5};
  const leaf=doorLeafSegment(door),gap=pointToSegment(from,leaf);
  // Verify this is the same actually recorded 45s FRONT door witness.
  assert.ok(dist(leaf.b,{x:127.22624491701302,y:279.8283221744376})<.75,
   'Garage geometry changed; do not trust the historical leaf witness');
  const world=sessionWorldGeometry(s);
  const sweep=(a,b)=>sweptBodyClear(a,b,s.doors,OPERATOR_RADIUS,world);
  const chosen=selectBlockedHingeStepback(from,goal,door,
   at=>world.passable(at,OPERATOR_RADIUS)&&
    bodyClear(at,s.doors,OPERATOR_RADIUS,world),sweep);
  const candidates=[];
  for(const length of [1.25,2.5,4,6,8,12])
   for(let i=0;i<16;i++){
    const theta=i*Math.PI/8;
    const to={x:from.x+Math.cos(theta)*length,
     y:from.y+Math.sin(theta)*length};
    if(!world.passable(to,OPERATOR_RADIUS)||
       !bodyClear(to,s.doors,OPERATOR_RADIUS,world)||
       !fullBodyMotorStrideClear(from,to,sweep))continue;
    const clearance=pointToSegment(to,leaf);
    candidates.push({to,step:length,leafClearance:clearance,
     improvement:clearance-gap,progress:dist(from,goal)-dist(to,goal)});
   }
  candidates.sort((a,b)=>b.improvement-a.improvement||
   b.progress-a.progress||a.step-b.step);
  console.log('D321B_GARAGE_FRONT_REAL_SWEEP',JSON.stringify({
   seed,from,goal,fraction:door.openFraction,
   actualLeafGap:gap,leaf,validSweepCount:candidates.length,
   best:candidates.slice(0,12),chosen
  }));
  assert.ok(Number.isFinite(gap)&&gap<OPERATOR_RADIUS+8);
  assert.ok(chosen,'a physically swept bounded step-back exists');
  assert.ok(dist(from,chosen)<=12.001);
  assert.ok(pointToSegment(chosen,leaf)>=OPERATOR_RADIUS+7);
  assert.ok(fullBodyMotorStrideClear(from,chosen,sweep));
  for(let i=0;i<=12;i++){
   const future={...door,openFraction:door.openFraction+
    (Math.max(1,door.pushTarget??1)-door.openFraction)*i/12};
   assert.ok(pointToSegment(chosen,doorLeafSegment(future))>=OPERATOR_RADIUS+5,
    'a retreat cannot be placed in the NEXT opening arc of the same real leaf');
  }
  // A valid departure is diagnostic evidence only, NOT proof that the
  // authoritative door motor can complete the whole four-person route.
 }finally{activateSite(null);}
});
