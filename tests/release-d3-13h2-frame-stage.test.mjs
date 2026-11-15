import test from 'node:test';
import assert from 'node:assert/strict';
import {joinedLocalOpenLeafStage}
 from '../src/breach-door-escape-stage.ts';
import {OPERATOR_RADIUS} from '../src/breach-core.ts';
const p=(x,y)=>({x,y});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('D3.13H2: a reachable near-side frame approach may join a swept portal',()=>{
 const door={id:'HINGE',a:p(300,260),b:p(340,260),kind:'hinged',
  hinge:'a',swing:1,open:true,openFraction:1,angularVelocity:0};
 const from=p(321,308),goal=p(320,152);
 const first=[];
 let stages=0,joins=0;
 const sweep=(a,b)=>{
  // Reproduce the genuine geometry constraint: from this approach the
  // direct diagonal to the distant leaf tip/far side intersects a wall,
  // while a first full-width step to the local current-side lane is clear.
  if(a===from || d(a,from)<.001){
   first.push({...b});
   return b.y>=260+OPERATOR_RADIUS+13 && b.y<305;
  }
  stages++;
  return b.x>=300+OPERATOR_RADIUS && b.x<=340-OPERATOR_RADIUS;
 };
 const route=joinedLocalOpenLeafStage(from,goal,door,sweep,()=>true,
   (at,g)=>{joins++;return [{x:at.x,y:180},{...g}];});
 assert.ok(route.length>=3,'a physical near-side, far-side, original GO');
 assert.deepEqual(route.at(-1),goal);
 assert.ok(first.some(x=>x.y>260),'first step is on the physical approach side');
 assert.ok(stages>=2&&joins>0,'the staged segments and joined tail were swept');
});

test('D3.13H2: refuses all unsafe or incomplete frame approaches',()=>{
 const door={id:'HINGE',a:p(300,260),b:p(340,260),kind:'hinged',
  hinge:'a',swing:1,open:true,openFraction:1,angularVelocity:0};
 const from=p(321,308),goal=p(320,152);
 assert.deepEqual(joinedLocalOpenLeafStage(from,goal,door,
   ()=>false,()=>true,()=>[goal]),[],
   'no physical passage when the full body cannot sweep');
 assert.deepEqual(joinedLocalOpenLeafStage(from,goal,door,
   ()=>true,()=>true,()=>[p(321,180)]),[],
   'stage alone is not completion of a distant authored GO');
 assert.deepEqual(joinedLocalOpenLeafStage(from,goal,
   {...door,openFraction:.2},()=>true,()=>true,()=>[goal]),[],
   'a closed or nearly closed leaf cannot be ignored');
});
