import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {plausibleMotorTraversal}
 from '../src/breach-motor-traversal.ts';
import {traversalStepClear,traversalKind,probeObstacleCrossing}
 from '../src/breach-mantle.ts';
import {pointToSegment,doorLeafSegment,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
import {releaseStaticWallOverlap}
 from '../src/breach-navigation.ts';
import {registerSessionWorldGeometry}
 from '../src/breach-world-context.ts';
import {isFootstepObstacle}
 from '../src/breach-traversal-surfaces.ts';

const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const p=(x,y)=>({x,y});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const crate=(x,y)=>({fixture:'crate',x,y,w:20,h:14,low:true});
const window=(x,y,vertical=true)=>({id:'W',x,y,vertical,width:42,
 open:true,shattered:false,operable:true,integrity:2,
 sillHeight:14,headHeight:38,treatment:'none'});

function oldSwept(from,to,target,cover,walls,doors,r=OPERATOR_RADIUS){
 const length=distance(from,to),steps=Math.max(1,Math.ceil(length/2.5));
 for(let i=0;i<=steps;i++){
  const t=i/steps,pt=p(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t);
  if(walls.some(w=>pointToSegment(pt,w)<r+1))return false;
  if(doors.some(d=>pointToSegment(pt,doorLeafSegment(d))<r+1))
   return false;
  if(cover.some((o,index)=>index!==target&&isFootstepObstacle(o)&&
   Math.abs(pt.x-o.x)<o.w/2+r&&Math.abs(pt.y-o.y)<o.h/2+r))
   return false;
 }
 return true;
}
function oldTraversal(from,to,op,world){
 const target=world.cover[op.obstacleIndex];
 if(!target||target.fixture!==op.fixture)return false;
 if(traversalKind(target)!==op.kind)return false;
 if(!oldSwept(from,to,op.obstacleIndex,world.cover,world.walls,
  world.doors))return false;
 if(distance(to,op.landing)<.15&&world.canStand&&!world.canStand(to))
  return false;
 return true;
}

test('P2.13 crossing prerequisite only rejects routes with no possible known traversable obstacle',()=>{
 const from=p(55,120),goal=p(145,120),cover=[
  crate(100,120),crate(100,195),{fixture:'pallet',x:91,y:120,w:12,h:12,low:true},
  {fixture:'fridge',x:80,y:120,w:25,h:25}
 ];
 assert.equal(plausibleMotorTraversal(from,goal,new Set(),cover,[]),false);
 assert.equal(plausibleMotorTraversal(from,goal,new Set([0]),cover,[]),true);
 assert.equal(plausibleMotorTraversal(from,goal,new Set([1]),cover,[]),false);
 assert.equal(plausibleMotorTraversal(from,goal,new Set([2]),cover,[]),false);
 assert.equal(plausibleMotorTraversal(from,goal,new Set([3]),cover,[]),false);
 assert.equal(plausibleMotorTraversal(from,p(70,120),new Set([0]),cover,[]),false);
 assert.equal(plausibleMotorTraversal(from,goal,new Set(),[],[window(100,120)]),true);
 assert.equal(plausibleMotorTraversal(from,p(85,120),new Set(),[],[window(100,120)]),false);
 assert.equal(plausibleMotorTraversal(from,goal,new Set(),[],[
  {...window(100,120),treatment:'bars'}]),false);
 assert.equal(plausibleMotorTraversal(from,goal,new Set(),[],[
  {...window(100,120),open:false,operable:true}]),true);
 const src=readFileSync(new URL('../src/breach-motor-traversal.ts',import.meta.url),'utf8');
 assert.ok(src.indexOf('if(!plausibleMotorTraversal(')<src.indexOf('const ordinary=routeWithSqueezeIntel('),
  'skip known-impossible traversal before entering full-grid A*');
});

test('P2.13 plausible crossing does not suppress actual known obstacle probes on randomized goals',()=>{
 const rand=random(13891);
 for(let i=0;i<240;i++){
  const from=p(20+rand()*200,20+rand()*200);
  const goal=p(20+rand()*200,20+rand()*200);
  const cover=Array.from({length:15},()=>crate(10+rand()*230,10+rand()*230));
  const span=distance(from,goal);
  const probe=span>170?p(from.x+(goal.x-from.x)*170/span,
    from.y+(goal.y-from.y)*170/span):goal;
  const world={cover,walls:[],doors:[]};
  const op=probeObstacleCrossing(from,probe,world);
  if(op){
   const known=new Set([op.obstacleIndex]);
   assert.equal(plausibleMotorTraversal(from,goal,known,cover,[]),true,
    'known actual candidate must never be pruned on trial '+i);
  }
 }
});

test('P2.13 every sampled vault collision result matches frozen full-array scans across dynamic doors',()=>{
 const rand=random(13697);
 const base=crate(180,180);
 const cover=[base,...Array.from({length:130},(_,i)=>({
  fixture:i%5===0?'pallet':'crate',
  x:10+rand()*400,y:10+rand()*400,
  w:10+rand()*30,h:10+rand()*30,low:true
 }))];
 const walls=Array.from({length:48},()=>({
  a:p(10+rand()*400,10+rand()*400),
  b:p(10+rand()*400,10+rand()*400)
 }));
 const doors=Array.from({length:24},(_,i)=>({
  id:'D'+i,a:p(10+rand()*400,10+rand()*400),
  b:p(10+rand()*400,10+rand()*400),
  open:true,openFraction:.5,hinge:'a',swing:1
 }));
 const op={kind:'vault',obstacleIndex:0,fixture:'crate',landing:p(198,180)};
 for(let i=0;i<280;i++){
  const from=p(50+rand()*290,50+rand()*290);
  const to=p(from.x+(rand()-.5)*75,from.y+(rand()-.5)*75);
  doors[0].openFraction=rand();
  doors[0].hinge=i%2?'a':'b';
  // Target geometry changes only when the live revision does.
  const world={cover,walls,doors,canStand:(pt)=>pt.x<390};
  assert.equal(traversalStepClear(from,to,op,world),
   oldTraversal(from,to,op,world),'vault parity '+i);
 }
});

test('P2.13 session wall index matches full-array candidate enumeration for embedded exits',()=>{
 const rand=random(71731);
 const walls=Array.from({length:140},(_,i)=>{
  const x=25+(i%14)*26,y=20+Math.floor(i/14)*33;
  return {a:p(x,y),b:p(x+10+(i%4),y)};
 });
 const cover=Array.from({length:70},()=>crate(20+rand()*380,20+rand()*360));
 const site={walls,cover,bounds:{minX:0,minY:0,maxX:470,maxY:430}};
 const state={site,coverState:cover,objectRevision:0};
 const indexed=registerSessionWorldGeometry(state);
 const brute={
  walls,cover,bounds:site.bounds,
  passable:(pt,r=OPERATOR_RADIUS)=>indexed.passable(pt,r),
  someWallNearPoint:(_pt,_radius,matches)=>walls.some((w,i)=>matches(w,i)),
  someCoverNearPoint:(_pt,_radius,matches)=>cover.some((o,i)=>matches(o,i))
 };
 for(let i=0;i<250;i++){
  const wall=walls[i%walls.length];
  const from=i%3===0?
    p(wall.a.x+rand()*12,wall.a.y+(rand()-.5)*20):
    p(20+rand()*405,20+rand()*385);
  const goal=p(from.x+(rand()-.5)*90,from.y+(rand()-.5)*90);
  const actual=releaseStaticWallOverlap(from,goal,[],1.3,indexed);
  const expected=releaseStaticWallOverlap(from,goal,[],1.3,brute);
  assert.deepEqual(actual,expected,'spatial wall parity '+i);
 }
});
