import test from 'node:test';
import assert from 'node:assert/strict';
import {joinedLocalOpenLeafStage}
 from '../src/breach-door-escape-stage.ts';
import {claimColdFrameApproachProbe}
 from '../src/breach-door-escape-rejoin.ts';
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

test('D3.13H2B: a short verified world connector can reach a frame-side stage',()=>{
 const door={id:'HINGE',a:p(300,260),b:p(340,260),kind:'hinged',
  hinge:'a',swing:1,open:true,openFraction:1,angularVelocity:0};
 const from=p(321,308),goal=p(320,152),via=p(345,307);
 const same=(a,b)=>d(a,b)<.001;
 let searches=0;
 const sweep=(a,b)=>!same(a,from)||same(b,via);
 const route=joinedLocalOpenLeafStage(from,goal,door,sweep,()=>true,
   (_at,g)=>[{...g}],undefined,
   (_at,target)=>{searches++;return [{...via},{...target}];});
 assert.ok(route.length>=4,'intermediate, near side, far side, authored GO');
 assert.deepEqual(route[0],via,'a fully swept world corridor reaches the near side');
 assert.deepEqual(route.at(-1),goal,'the player-authored destination is retained');
 assert.ok(searches>0&&searches<=2,'no unbounded or per-frame A* candidates');
 let at=from;
 for(const node of route){
  assert.equal(sweep(at,node),true,'each submitted physical leg is fully swept');
  at=node;
 }
});

test('D3.13H2B: a blocked world connector cannot become an authored route',()=>{
 const door={id:'HINGE',a:p(300,260),b:p(340,260),kind:'hinged',
  hinge:'a',swing:1,open:true,openFraction:1,angularVelocity:0};
 const from=p(321,308),goal=p(320,152);
 let probes=0;
 const route=joinedLocalOpenLeafStage(from,goal,door,
   (a,_b)=>d(a,from)>.01,()=>true,()=>[goal],undefined,
   (_a,target)=>{probes++;return [p(355,308),{...target}];});
 assert.deepEqual(route,[],'invalid first approach never replaces the MOVE');
 assert.ok(probes<=2,'a failed cold probe has a strict pathfinder budget');
});

test('D3.13H2C: cold searches are capped for an unchanged real leaf and MOVE',()=>{
 const actor={plan:[{kind:'move',id:17}],p:p(250,270)};
 const goal=p(520,150);
 assert.deepEqual(Array.from({length:5},()=>
  claimColdFrameApproachProbe(actor,'D2',goal,1)),
  [true,true,true,true,false],
  'only four attempts per stationary opened leaf and authored order');
 assert.equal(claimColdFrameApproachProbe(actor,'D2',goal,.75),true,
  'a materially changed actual physical leaf permits a fresh probe');
 actor.plan[0]={kind:'move',id:18};
 assert.equal(claimColdFrameApproachProbe(actor,'D2',goal,.75),true,
  'a genuinely revised MOVE is a distinct physical route');
 actor.p=p(295,270);
 assert.equal(claimColdFrameApproachProbe(actor,'D2',goal,.75),true,
  'meaningful real body progress releases the previous cold budget');
 actor.plan=[];
 assert.equal(claimColdFrameApproachProbe(actor,'D2',goal,.75),false,
  'an operator with no active MOVE can never ask for one');
});
