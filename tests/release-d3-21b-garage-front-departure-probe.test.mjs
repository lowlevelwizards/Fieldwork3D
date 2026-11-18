import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS,doorLeafSegment,pointToSegment}
 from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {sweptBodyClear,bodyClear} from '../src/breach-navigation.ts';
import {fullBodyMotorStrideClear} from '../src/breach-stack-micro-corner.ts';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('D3.21 read-only: real Garage FRONT geometry admits swept short steps, not guaranteed GO',()=>{
 const seed=19285501;
 const site=generateSite(seed,'standard',undefined,
  {mission:'intel'},{archetype:'garage'});
 const s=newSession(0,seed,'full-view','standard','intel',
  {...site,training:true,enemies:[],encounter:undefined},
  {enableCivilians:false});
 try{
  const door=s.doors.find(d=>d.id==='FRONT');
  assert.ok(door,'same real Garage fixture FRONT');
  door.open=true;door.openFraction=.8587962693316564;
  door.angularVelocity=0;door.pushTarget=1;
  const from={x:121,y:273},goal={x:597.6,y:564.5};
  const leaf=doorLeafSegment(door),gap=pointToSegment(from,leaf);
  assert.ok(dist(leaf.b,{x:127.22624491701302,y:279.8283221744376})<.75,
   'Garage geometry changed; historical leaf witness no longer applies');
  const world=sessionWorldGeometry(s);
  const sweep=(a,b)=>sweptBodyClear(a,b,s.doors,OPERATOR_RADIUS,world);
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
    let futureGap=Infinity;
    for(let j=0;j<=12;j++){
     const future={...door,openFraction:door.openFraction+
      (Math.max(1,door.pushTarget??1)-door.openFraction)*j/12};
     futureGap=Math.min(futureGap,
      pointToSegment(to,doorLeafSegment(future)));
    }
    candidates.push({to,step:length,leafClearance:clearance,
     futureGap,improvement:clearance-gap,
     progress:dist(from,goal)-dist(to,goal)});
   }
  candidates.sort((a,b)=>b.improvement-a.improvement||
   b.progress-a.progress||a.step-b.step);
  const futureSafe=candidates.filter(c=>
   c.leafClearance>=OPERATOR_RADIUS+7&&
   c.futureGap>=OPERATOR_RADIUS+5);
  console.log('D321_GARAGE_FRONT_REAL_SWEEP',JSON.stringify({
   seed,from,goal,actualLeafGap:gap,validSweepCount:candidates.length,
   futureSafeCount:futureSafe.length,
   examples:futureSafe.slice(0,5)
  }));
  assert.ok(gap<OPERATOR_RADIUS+8);
  assert.ok(candidates.length>0,'physical departure must be possible');
  assert.ok(futureSafe.length>0,
   'some retreat avoids the current AND near-future solid leaf');
  // A safe short departure does NOT prove a valid route to the authored GO.
 }finally{activateSite(null);}
});
