import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {route} from '../src/breach-core.ts';
const windowSill={x:602,y:305.5,w:10,h:52};
function passableWithSill(p,r=8,sill=windowSill){
 return p.x>24+r&&p.x<720-r&&p.y>24+r&&p.y<690-r&&
  !(Math.abs(p.x-sill.x)<sill.w/2+r&&
    Math.abs(p.y-sill.y)<sill.h/2+r);
}
function physicallyClear(a,b,canStand){
 const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/2.5));
 for(let i=1;i<=steps;i++){
  const t=i/steps;
  if(!canStand({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}))return false;
 }
 return true;
}
test('D3.2.10: legal actor beside seeded garage window sill can route from an obstructed snapped start',()=>{
 const from={x:613.07,y:339.61},goal={x:115,y:164};
 const canStand=p=>passableWithSill(p);
 const snap={x:Math.round(from.x/16)*16,y:Math.round(from.y/16)*16};
 assert.equal(canStand(from),true,'real actor body is legal');
 assert.equal(canStand(snap),false,'old A* snapped into the sill');
 const path=route(from,goal,canStand,true);
 assert.ok(path.length>0,'single A* must find a physical grid entry without teleporting');
 let prior=from;
 for(const point of path){
  assert.equal(physicallyClear(prior,point,canStand),true,
   'first and later route segments must remain physically clear');
  prior=point;
 }
 assert.deepEqual(path.at(-1),goal);
});
test('D3.2.10: mirrored furniture-edge starts still use fully swept anchors',()=>{
 const seeds=[{x:613.07,y:339.61},{x:590.93,y:339.61},
  {x:613.07,y:271.39},{x:590.93,y:271.39}];
 const goals=[{x:700,y:150},{x:500,y:150},
  {x:700,y:450},{x:500,y:450}];
 for(let i=0;i<seeds.length;i++){
  const from=seeds[i],goal=goals[i],canStand=p=>passableWithSill(p);
  assert.equal(canStand(from),true,'seed '+i+' has legal body');
  const path=route(from,goal,canStand,true);
  assert.ok(path.length>0,'expected feasible route seed '+i);
  assert.equal(physicallyClear(from,path[0],canStand),true,
   'first segment must be clear seed '+i);
 }
});
test('D3.2.10: impossible world remains impossible; no ghost start anchor',()=>{
 const canStand=p=>p.x>=300&&p.x<=390&&p.y>=300&&p.y<=390;
 const from={x:351,y:351},goal={x:100,y:100};
 assert.deepEqual(route(from,goal,canStand),[]);
});

test('D3.2.11: ordinary authored paths do not enable furniture-start rescue',()=>{
 const source=readFileSync(new URL('../src/breach-motor-collision.ts',import.meta.url),'utf8');
 assert.match(source,/a\.lastBlocker==='furniture'&&a\.blockedTime>=\.85/);
 const core=readFileSync(new URL('../src/breach-core.ts',import.meta.url),'utf8');
 assert.match(core,/repairBlockedStart=false/);
});
