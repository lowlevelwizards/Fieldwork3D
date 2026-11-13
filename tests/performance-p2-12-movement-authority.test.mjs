import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveMovementFrame,sweptPairMayTouch}
 from '../src/breach-movement-authority.ts';
import {reconcileCivilianTransportFrame}
 from '../src/breach-civilian-transport.ts';

// Frozen pre-P2.12 reference: independent pair resolver with no swept-AABB
// shortcut. Compare exact decisions, original order and geometry callback
// sequence, not just perceived movement or elapsed time.
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function oldCrosses(a,b){
 const final=dist(a.to,b.to),initial=dist(a.from,b.from);
 const envelope=a.side==='neutral'||b.side==='neutral'?20:11;
 if(final<envelope&&final<initial-.001)return true;
 const ux=a.to.x-a.from.x-(b.to.x-b.from.x);
 const uy=a.to.y-a.from.y-(b.to.y-b.from.y);
 const ox=a.from.x-b.from.x,oy=a.from.y-b.from.y;
 const sq=ux*ux+uy*uy;
 if(sq<1e-7)return false;
 const t=Math.max(0,Math.min(1,-(ox*ux+oy*uy)/sq));
 const at=Math.hypot(ox+ux*t,oy+uy*t);
 return at<(envelope===20?19:10)&&at<initial-.001;
}
function referenceFrame(proposals,physicallyClear){
 const draft=new Map();
 const candidates=proposals.filter(p=>p.alive&&!p.carried);
 for(const p of proposals){
  const blocked=dist(p.from,p.to)>.0001&&p.alive&&!p.carried&&!physicallyClear(p);
  draft.set(p.id,{id:p.id,point:blocked?p.from:p.to,
   blocked:blocked?'geometry':null});
 }
 const ordered=[...candidates].sort((a,b)=>a.id.localeCompare(b.id));
 for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
  const a=ordered[i],b=ordered[j];
  if(a.side===b.side&&a.side!=='neutral')continue;
  if((a.side==='blue'&&b.side==='neutral')||
     (b.side==='blue'&&a.side==='neutral'))continue;
  const pa=draft.get(a.id),pb=draft.get(b.id);
  const da={...a,to:pa.point},db={...b,to:pb.point};
  if(!oldCrosses(da,db))continue;
  const movingA=dist(a.from,pa.point)>.0001;
  const movingB=dist(b.from,pb.point)>.0001;
  const loser=!movingA?b:!movingB?a:b;
  const result=draft.get(loser.id);
  result.point=loser.from;result.blocked='actor';
  const winner=loser===a?b:a,winning=draft.get(winner.id);
  if(dist(winning.point,loser.from)<
      (winner.side==='neutral'||loser.side==='neutral'?20:11)&&
     dist(winner.from,loser.from)>dist(winning.point,loser.from)+.001){
    winning.point=winner.from;winning.blocked='actor';
  }
 }
 return proposals.map(p=>draft.get(p.id));
}
function random(seed){return ()=>{
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 return seed/4294967296;
};}
const p=(x,y)=>({x,y});
const copy=x=>structuredClone(x);

test('P2.12 spatial rejection retains all previous movement authority outcomes',()=>{
 const rng=random(121212);
 for(let round=0;round<200;round++){
  const count=3+Math.floor(rng()*28);
  const proposals=[];
  for(let i=0;i<count;i++){
   const from=p(Math.floor(rng()*14)*20,Math.floor(rng()*12)*20);
   const speed=rng();
   const to=speed<.3?{...from}:p(from.x+(rng()-.5)*28,
     from.y+(rng()-.5)*28);
   proposals.push({id:'a-'+String(i).padStart(3,'0'),
     side:['blue','red','neutral'][Math.floor(rng()*3)],
     from,to,alive:rng()>.1,carried:rng()<.04});
  }
  // Unchanged physically-clear oracle; avoid relying on callback timing.
  const eligible=q=>q.to.x>=0&&q.to.y>=0&&q.to.x<300&&q.to.y<260;
  const refCalls=[],newCalls=[];
  const expected=referenceFrame(proposals,q=>{
   refCalls.push(q.id);return eligible(q);
  });
  const actual=resolveMovementFrame(proposals,q=>{
   newCalls.push(q.id);return eligible(q);
  });
  assert.deepEqual(actual,expected,'right-of-way and positions round '+round);
  assert.deepEqual(newCalls,refCalls,'authoritative world checks round '+round);
 }
});

test('P2.12 swept broadphase never rejects a pair the frozen exact predicate collides',()=>{
 const rng=random(32165);
 for(let i=0;i<3500;i++){
  const af=p((rng()-.5)*500,(rng()-.5)*500);
  const bf=p((rng()-.5)*500,(rng()-.5)*500);
  const at=p(af.x+(rng()-.5)*120,af.y+(rng()-.5)*120);
  const bt=p(bf.x+(rng()-.5)*120,bf.y+(rng()-.5)*120);
  const envelope=i%2?20:11;
  if(oldCrosses({from:af,to:at,side:envelope===20?'neutral':'red'},
    {from:bf,to:bt,side:'red'}))
   assert.equal(sweptPairMayTouch(af,at,bf,bt,envelope),true,
    'the broadphase must never discard a true contact '+i);
 }
 // Exact threshold boundaries and crossing paths.
 assert.equal(sweptPairMayTouch(p(0,0),p(3,0),p(23,0),p(23,0),20),false);
 assert.equal(sweptPairMayTouch(p(0,0),p(40,0),p(20,-20),p(20,20),20),true);
});

// Frozen pre-P2.12 custody reconciliation, including ID-sorted links,
// crossing in continuous relative motion, carrier rollback and safe yield.
function legacyReconcile(proposals,decisions,links){
 if(!links.length)return;
 const original=new Map(proposals.map(p=>[p.id,p]));
 const resolved=new Map(decisions.map(d=>[d.id,d]));
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const crosses=(af,at,bf,bt)=>{
  const initial=distance(af,bf),final=distance(at,bt);
  if(final<20&&final<initial-.001)return true;
  const ox=af.x-bf.x,oy=af.y-bf.y;
  const vx=at.x-af.x-(bt.x-bf.x),vy=at.y-af.y-(bt.y-bf.y);
  const denom=vx*vx+vy*vy;
  if(denom<1e-7)return false;
  const t=Math.max(0,Math.min(1,-(ox*vx+oy*vy)/denom));
  const closest=Math.hypot(ox+vx*t,oy+vy*t);
  return closest<19&&closest<initial-.001;
 };
 for(const {carrierId,bodyId} of [...links].sort(
   (a,b)=>a.carrierId.localeCompare(b.carrierId))){
  const carrier=resolved.get(carrierId),body=resolved.get(bodyId);
  const carrierStart=original.get(carrierId),bodyStart=original.get(bodyId);
  if(!carrier||!body||!carrierStart||!bodyStart)continue;
  if(carrier.blocked){
    body.point=bodyStart.from;body.blocked='actor';continue;
  }
  for(const other of proposals){
    if(other.id===carrierId||other.id===bodyId||
       !other.alive||other.carried)continue;
    const movement=resolved.get(other.id);
    if(!movement||!crosses(bodyStart.from,body.point,
      other.from,movement.point))continue;
    const otherMoved=distance(other.from,movement.point)>.0001;
    const safeToYield=otherMoved&&
      !crosses(bodyStart.from,body.point,other.from,other.from)&&
      distance(body.point,other.from)>=20;
    if(safeToYield){
      movement.point=other.from;movement.blocked='actor';continue;
    }
    carrier.point=carrierStart.from;carrier.blocked='actor';
    body.point=bodyStart.from;body.blocked='actor';
    break;
  }
 }
}
test('P2.12 carried civilian rollback and other-actor yield match prior resolver',()=>{
 const rng=random(88021);
 for(let round=0;round<220;round++){
  const proposals=[
   {id:'carrier',side:'blue',from:p(50,50),
    to:p(51+rng()*4,49+rng()*4),alive:true},
   {id:'body',side:'neutral',from:p(40,50),
    to:p(41+rng()*4,49+rng()*4),alive:false,carried:true}
  ];
  for(let i=0;i<18;i++){
   const from=p(rng()*190,rng()*155);
   const to=p(from.x+(rng()-.5)*20,from.y+(rng()-.5)*20);
   proposals.push({id:'other'+i,side:i%2?'neutral':'red',
    from,to,alive:rng()>.1});
  }
  const decisions=proposals.map(q=>({id:q.id,point:q.to,blocked:null}));
  const expected=copy(decisions),actual=copy(decisions);
  const links=[{carrierId:'carrier',bodyId:'body'}];
  legacyReconcile(proposals,expected,links);
  reconcileCivilianTransportFrame(proposals,actual,links);
  assert.deepEqual(actual,expected,'carrier rollback round '+round);
 }
});

test('P2.12 no-op far-pair culling and civilian route profiling are opt-in only',()=>{
 const far=Array.from({length:48},(_,i)=>p((i%8)*230,Math.floor(i/8)*230));
 let possible=0;
 for(let i=0;i<far.length;i++)for(let j=i+1;j<far.length;j++)
  if(sweptPairMayTouch(far[i],far[i],far[j],far[j],20))possible++;
 assert.equal(possible,0,'separated stationary pairs must skip expensive crossing math');
 const phase=readFileSync(new URL('../src/breach-simulation-motion-phase.ts',import.meta.url),'utf8');
 assert.match(phase,/const withinSquared=/);
 assert.match(phase,/withinSquared\(a\.p,p,400\)/);
 assert.match(phase,/withinSquared\(o\.p,p,484\)/);
 assert.match(phase,/withinSquared\(c\.p,p,484\)/);
 assert.match(phase,/civilian-motion\/route-search/);
 assert.match(phase,/if\(!profile\)return port\.routeTo\(s,from,to\)/,
   'no route profiling wall clock should run without ?perf=1');
});
