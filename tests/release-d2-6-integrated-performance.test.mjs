/** D2.6: hotpath changes must be mechanically equivalent and deterministic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveMovementFrame,sweptPairMayTouch}
 from '../src/breach-movement-authority.ts';
import {advanceActorSightProgress}
 from '../src/breach-visual-acquisition.ts';
import {forEachGroundSightCandidate}
 from '../src/breach-ground-discovery.ts';
import {groundView}
 from '../src/breach-ground-view.ts';
import {newSession,team,stepSession,toggling}
 from '../src/breach-game.ts';
import {stage1ContactSite,stage1DoorSite,stage1Snapshot}
 from './fixtures/breach-stage1-contract-runner.mjs';
import {activateSite} from '../src/breach-core.ts';
const source=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function baselineMovement(proposals,physicallyClear){
 const moved=p=>dist(p.from,p.to)>.0001;
 if(!proposals.some(p=>p.alive&&!p.carried&&moved(p)))
  return proposals.map(p=>({id:p.id,point:p.to,blocked:null}));
 const draft=new Map();
 const candidates=proposals.filter(p=>p.alive&&!p.carried);
 for(const p of proposals){
  const blocked=moved(p)&&p.alive&&!p.carried&&!physicallyClear(p);
  draft.set(p.id,{id:p.id,point:blocked?p.from:p.to,
   blocked:blocked?'geometry':null});
 }
 const ordered=[...candidates].sort((a,b)=>a.id.localeCompare(b.id));
 const crosses=(a,b)=>{
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
 };
 for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
  const a=ordered[i],b=ordered[j];
  if(a.side===b.side&&a.side!=='neutral')continue;
  if((a.side==='blue'&&b.side==='neutral')||
      (b.side==='blue'&&a.side==='neutral'))continue;
  const pa=draft.get(a.id),pb=draft.get(b.id);
  if(!sweptPairMayTouch(a.from,pa.point,b.from,pb.point,
    a.side==='neutral'||b.side==='neutral'?20:11))continue;
  const da={...a,to:pa.point},db={...b,to:pb.point};
  if(!crosses(da,db))continue;
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
test('D2.6.3 no-clone collision arbitration matches original exact algorithm',()=>{
 let rng=1293;
 const random=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);
 for(let seed=0;seed<140;seed++){
  const n=2+seed%18,ps=[];
  for(let i=0;i<n;i++){
   const from={x:Math.floor(random()*120),y:Math.floor(random()*120)};
   const speed=seed%4===0?0:random()*28;
   const yaw=random()*Math.PI*2;
   ps.push({id:'p'+String(i).padStart(2,'0'),
    side:['blue','red','neutral'][Math.floor(random()*3)],
    from,to:{x:from.x+Math.cos(yaw)*speed,
      y:from.y+Math.sin(yaw)*speed},
    alive:random()>.08,carried:random()<.05});
  }
  const original=baselineMovement(ps,p=>p.to.x>=3&&p.to.y>=4);
  const optimized=resolveMovementFrame(ps,p=>p.to.x>=3&&p.to.y>=4);
  assert.deepEqual(optimized,original,'stable winner and positions for case '+seed);
 }
});
test('D2.6.2 no LOS never builds expensive scene light field',()=>{
 const a={id:'blue',side:'blue',health:4,p:{x:0,y:0},heading:0,
  velocity:0,posture:'stand',awareness:{visualProgress:{red:1}}};
 const b={id:'red',side:'red',health:4,p:{x:5,y:0},heading:0,
  velocity:0,posture:'stand',awareness:{visualProgress:{blue:1}}};
 const s={operators:[a,b],seconds:2,
  get site(){throw new Error('lighting field must not be sampled');}};
 let sightTests=0;
 advanceActorSightProgress(s,1/60,()=>{
  sightTests++;return false;
 });
 assert.equal(sightTests,2);
 assert.equal(a.awareness.visualProgress.red,0);
 assert.equal(b.awareness.visualProgress.blue,0);
});
test('D2.6.1 idle-yield path owns one candidate-ID snapshot and exact motor',()=>{
 const src=source('breach-simulation-actor-phase.ts');
 assert.match(src,/let nearby:TeamActor\[\]\|null=null/);
 assert.match(src,/const nearbyIds=nearby\.map\(b=>b\.id\)/);
 assert.match(src,/idleYieldAllowed\(s,a\.id,nearbyIds\)/);
 assert.match(src,/commitIdleYield\(s,a\.id,nearbyIds\)/);
 assert.doesNotMatch(src,/nearby\.map\(b=>b\.id\).*idleYieldAllowed/);
 assert.match(src,/sweptBodyClear\(from,to,s\.doors,OPERATOR_RADIUS,sessionWorldGeometry\(s\)\)/);
});
test('D2.6.3 transport roster remains actor-first and motion arbiter owns all decisions',()=>{
 const src=source('breach-simulation-motion-phase.ts');
 assert.match(src,/let coupledBodyStarts:Map<string,Pt>\|null=null/);
 assert.match(src,/if\(!coupledBodyStarts\)coupledBodyStarts=new Map/);
 assert.match(src,/for\(const o of s\.operators\)if\(o!==carrier&&o\.health>0\)/);
 assert.match(src,/for\(const c of s\.civilians\)if\(c!==civil\)/);
 assert.match(src,/resolveMovementFrame\(proposals/);
 assert.match(src,/reconcileCivilianTransportFrame\(proposals,decisions,transportLinks\)/);
});
test('D2.6 clock, RNG, replay-visible tactical state remain deterministic',()=>{
 for(const site of [stage1ContactSite(),stage1DoorSite()]){
  const run=()=>{
   const s=newSession(0,undefined,'full-view','small','hold',
    structuredClone(site));toggling(s);
   for(let i=0;i<65&&s.phase==='running';i++)stepSession(s,1/60);
   return {state:stage1Snapshot(s),events:s.executionEvents,
    battles:s.battleEvents};
  };
  try{assert.deepEqual(run(),run());}finally{activateSite(null);}
 }
});

test('D2.6.4 early far-cell bucket filter visits exactly the historical cells in order',()=>{
 const bounds={minX:0,minY:0,maxX:1360,maxY:1420};
 for(const heading of [0,Math.PI/5,Math.PI*.79,-1.3]){
  for(const radius of [240,450,850,1850]){
   const view=groundView(305,415,heading,radius);
   for(let bucket=0;bucket<16;bucket++){
    const before=[],after=[];
    forEachGroundSightCandidate(view,bounds,20,(col,row,p)=>{
     if(((col+row*3)&15)!==bucket)return;
     before.push([col,row,p.x,p.y]);
    });
    forEachGroundSightCandidate(view,bounds,20,(col,row,p)=>{
     after.push([col,row,p.x,p.y]);
    },bucket);
    assert.deepEqual(after,before,
      'same ranked terrain cells, radius '+radius+' bucket '+bucket);
   }
  }
 }
});
