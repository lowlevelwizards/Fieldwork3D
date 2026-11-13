import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectFireableContact} from '../src/breach-target-selection.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {choosePhysicalCorrection} from '../src/breach-combat-reactions.ts';
import {combatCostCounts,drainCombatCostDiagnostics,
 setCombatCostDiagnosticsEnabled} from '../src/breach-combat-cost-counters.ts';

const source=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
const p=(x,y)=>({x,y});
/** Exact pre-D2.1 behavior, including candidate callback order. */
function originalTarget(origin,visible,currentId,clearLane){
 if(!visible.length)return null;
 const near=[...visible].sort((a,b)=>{
  const ad=Math.hypot(a.p.x-origin.x,a.p.y-origin.y);
  const bd=Math.hypot(b.p.x-origin.x,b.p.y-origin.y);
  return ad-bd||a.id.localeCompare(b.id);
 });
 if(near.length===1)return near[0];
 const valid=near.filter(clearLane);
 return valid.find(t=>t.id===currentId)??valid[0]??
   near.find(t=>t.id===currentId)??near[0];
}
function checkTargetParity(visible,current,allowed){
 const before=[],after=[];
 const origin=p(0,0);
 const old=originalTarget(origin,visible,current,v=>{
  before.push(v.id);return allowed.has(v.id);
 });
 const updated=selectFireableContact(origin,visible,current,v=>{
  after.push(v.id);return allowed.has(v.id);
 });
 assert.equal(updated,old,'the same source target must win');
 assert.deepEqual(after,before,'check every lane, in same stable order');
}
test('D2.1a target selection matches reference for 0/1/2/8/16 contacts and all blocker masks',()=>{
 for(const n of [0,1,2,8,16]){
  const targets=Array.from({length:n},(_,i)=>({
   id:'enemy-'+String(i).padStart(2,'0'),
   p:p((i%2===0?-1:1)*(10+Math.floor(i/2)*10),
     i%4<2?0:6)
  })).reverse();
  for(const current of [null,'missing',targets[0]?.id??null,
    targets.at(-1)?.id??null]){
   for(const mask of [0,1,3,7,15,255,65535]){
    const legal=new Set(targets.filter((_,i)=>
     ((mask>>>i)&1)!==0).map(t=>t.id));
    checkTargetParity(targets,current,legal);
   }
  }
 }
});
test('D2.1a equal range uses ID tie then original array for identical ID',()=>{
 const visible=[
  {id:'z',p:p(-20,0)},
  {id:'b',p:p(0,20)},
  {id:'a',p:p(20,0)},
  {id:'a',p:p(-20,0)}
 ];
 checkTargetParity(visible,'z',new Set(['a','b','z']));
 checkTargetParity(visible,'a',new Set(['a','z']));
 checkTargetParity(visible,'missing',new Set());
});
test('D2.1a no early exit: safety warning callback still runs for every multi-target contact',()=>{
 const targets=[{id:'near',p:p(20,0)},{id:'far',p:p(70,0)}];
 let warnings=0;
 const picked=selectFireableContact(p(0,0),targets,'near',v=>{
  if(v.id==='far')warnings++;
  return v.id==='near';
 });
 assert.equal(picked,targets[0]);assert.equal(warnings,1);
 warnings=0;
 assert.equal(selectFireableContact(p(0,0),[targets[0]],null,()=>{
  warnings++;return false;
 }),targets[0]);
 assert.equal(warnings,0,'one visible but blocked target still tracked');
});
test('D2.1a order threats remain stable one-pass sorted-order equivalent',()=>{
 const src=source('breach-order-executor.ts');
 assert.match(src,/for\(const e of s\.operators\)/);
 assert.match(src,/if\(!visibleThreat\|\|distance<nearestDistance\)/);
 assert.doesNotMatch(src,/s\.operators\.filter\(e=>e\.side==='red'\)/);
 assert.doesNotMatch(src,/\.sort\(\(x,y\)=>d\(a\.p,x\.p\)/);
 const threats=[p(10,0),p(3,4),p(0,-5),p(80,0)];
 const ordered=threats.map((v,i)=>({id:i,p:v,side:'red',health:3}));
 const before=ordered.filter(x=>x.side==='red'&&x.health>0)
   .sort((a,b)=>Math.hypot(a.p.x,a.p.y)-Math.hypot(b.p.x,b.p.y))[0];
 let picked,nearest=Infinity;
 for(const e of ordered){
  if(e.side!=='red'||e.health<=0)continue;
  const distance=Math.hypot(e.p.x,e.p.y);
  if(!picked||distance<nearest){picked=e;nearest=distance;}
 }
 assert.equal(picked,before,'equal distance tie keeps original roster order');
});
test('D2.1b quiet fire never allocates friendly volumes without visible contact',()=>{
 const src=source('breach-firing-pipeline.ts');
 assert.match(src,/if\(visible\.length\)for\(const other of s\.operators\)/);
 assert.match(src,/const target=selectFireableContact/);
 assert.match(src,/if\(!target\)\{/);
 assert.match(src,/settlePassiveAim\(a,dt\)/);
});
test('D2.1c counters are disabled by default, opt-in, detached and resettable',()=>{
 const input={x:100,z:100,heading:0,weaponYaw:0,
  weapon:'carbine',aim:.8,velocity:0,recoil:0,posture:'stand'};
 try{
  setCombatCostDiagnosticsEnabled(false);
  weaponClearance(input,[],[],[]);
  choosePhysicalCorrection(p(0,0),0,'muzzle',()=>false,()=>true);
  selectFireableContact(p(0,0),[{id:'a',p:p(10,0)},{id:'b',p:p(20,0)}],
   null,()=>true);
  assert.deepEqual(drainCombatCostDiagnostics(),{
   clearanceCalls:0,clearanceProbes:0,multiTargetLaneChecks:0,
   correctionSearches:0,correctionCandidates:0
  });
  setCombatCostDiagnosticsEnabled(true);
  const clear=weaponClearance(input,[],[],[]);
  assert.equal(clear.blocked,false);
  const selected=selectFireableContact(p(0,0),
   [{id:'a',p:p(10,0)},{id:'b',p:p(20,0)}],null,()=>true);
  assert.equal(selected.id,'a');
  const correction=choosePhysicalCorrection(p(0,0),0,'muzzle',
   () => false,()=>true);
  assert.equal(correction,null);
  const snapshot=drainCombatCostDiagnostics();
  assert.equal(snapshot.clearanceCalls,1);
  assert.ok(snapshot.clearanceProbes>=1);
  assert.equal(snapshot.multiTargetLaneChecks,2);
  assert.equal(snapshot.correctionSearches,1);
  assert.ok(snapshot.correctionCandidates>0);
  snapshot.clearanceCalls=500;
  assert.equal(combatCostCounts.clearanceCalls,0);
  assert.equal(drainCombatCostDiagnostics().clearanceCalls,0);
  setCombatCostDiagnosticsEnabled(false);
  assert.equal(combatCostCounts.clearanceCalls,0);
 }finally{setCombatCostDiagnosticsEnabled(false);}
});
test('D2.1c same projectile safety and RNG authority still belongs to shot resolver',()=>{
 const resolver=source('breach-shot-resolution.ts');
 assert.match(resolver,/const proposedYaw=shotYaw\(a\.weaponYaw,cone,random\(s\),random\(s\)\)/);
 assert.match(resolver,/const shotClearance=weaponClearance/);
 assert.match(resolver,/if\(assessFriendlyLane\(muzzlePoint,muzzle\.y,far,strikeHeight/);
 assert.match(resolver,/if\(observedCivilianFireLane\(s,a,muzzlePoint,muzzle\.y/);
 const renderer=source('breach-runtime-loop.ts');
 assert.match(renderer,/setCombatCostDiagnosticsEnabled\(!!perfOverlay\)/);
 assert.match(renderer,/drainCombatCostDiagnostics\(\)/);
});
