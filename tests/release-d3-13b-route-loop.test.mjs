import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {observeRouteLoop,worthwhileLoopRecovery,routeCourseLength}
 from '../src/breach-route-loop-recovery.ts';
const p=(x,y)=>({x,y});
const actor=()=>({id:'rook',p:p(100,100),plan:[{id:1,kind:'move',p:p(320,100)}]});
const sample=(a,fn,goal=p(320,100),eligible=true)=>{
 let detected=0;
 for(let i=0;i<=480;i++){
  a.p=fn(i/60);
  if(observeRouteLoop(a,goal,i/60,eligible))detected++;
 }
 return detected;
};
test('D3.13B: repeated real movement around a closed loop triggers once',()=>{
 const a=actor();
 assert.equal(sample(a,t=>p(100+19*Math.sin(2*Math.PI*t/8),
  100+19*(1-Math.cos(2*Math.PI*t/8)))),1);
});
test('D3.13B: long but productive traversal is not confused with circling',()=>{
 const a=actor();
 assert.equal(sample(a,t=>p(100+12*t,100+10*Math.sin(t))),0);
});
test('D3.13B: deliberate WAIT, order edits, and old replay clocks reset',()=>{
 const a=actor(),goal=p(320,100);
 assert.equal(observeRouteLoop(a,goal,1,false),false);
 assert.equal(observeRouteLoop(a,goal,2,true),false);
 a.plan[0].id=2;
 assert.equal(observeRouteLoop(a,goal,3,true),false);
 assert.equal(observeRouteLoop(a,goal,0,true),false);
 assert.equal(observeRouteLoop(a,p(300,100),.1,true),false);
});
test('D3.13B: only a materially shorter route is worth an extra A*',()=>{
 const from=p(0,0);
 const old=[p(0,100),p(100,100),p(100,0)];
 const direct=[p(100,0)];
 assert.equal(routeCourseLength(from,old),300);
 assert.equal(worthwhileLoopRecovery(from,old,direct),true);
 assert.equal(worthwhileLoopRecovery(from,old,old),false);
 assert.equal(worthwhileLoopRecovery(from,old,[]),false);
 assert.equal(worthwhileLoopRecovery(from,[p(20,0)],direct),false);
 assert.equal(worthwhileLoopRecovery(from,[p(0,90),p(100,90),p(100,0)],
  [p(0,85),p(100,85),p(100,0)]),false);
});
test('D3.13B: world-truth proposal must pass full-radius physical sweep',()=>{
 const code=readFileSync(new URL('../src/breach-motor-route.ts',import.meta.url),'utf8');
 assert.match(code,/observeRouteLoop\(a,p,s\.seconds,/);
 assert.match(code,/routeWithSqueezeWorld\(a\.p,p,s\.doors,world\)/);
 assert.match(code,/worthwhileLoopRecovery\(a\.p,a\.nav,alternative\)/);
 assert.match(code,/sweptBodyClear\(a\.p,alternative\[0\],s\.doors,OPERATOR_RADIUS,world\)/);
 assert.match(code,/setTransientRoute\(s,a,alternative,'loop-world-replan'\)/);
});
