/** EB0: deterministic real-session load/identity census; no renderer or secondary simulation. */
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {newSession,enemies,toggling,stepSession} from '../src/breach-game.ts';
import {stage1ContactSite} from '../tests/fixtures/breach-stage1-contract-runner.mjs';
import {activateSite} from '../src/breach-core.ts';
const counts=[4,8,16,32],ticks=180;
const q=(a,p)=>a[Math.floor((a.length-1)*p)]??0;
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const rows=[];
for(const count of counts){
 const site=stage1ContactSite();site.name='EB0 SYNTHETIC LOAD';site.bounds={minX:0,minY:0,maxX:1200,maxY:920};
 site.objective={x:1100,y:830};site.extract={x:1100,y:860};
 site.enemies=Array.from({length:count},(_,i)=>({x:450+(i%8)*60,y:140+Math.floor(i/8)*70}));
 const s=newSession(0,undefined,'full-view','small','hold',site);
 try{
  const foes=enemies(s);assert.equal(foes.length,count);
  const identity=foes.map(a=>[a.id,a.npcIdentity?.groupKind,a.npcIdentity?.competence,a.weapon]);
  const times=[],phase=new Map(),trace=[];
  toggling(s);
  for(let i=0;i<ticks&&s.phase==='running';i++){
   const start=performance.now();
   stepSession(s,1/60,(name,ms)=>{const a=phase.get(name)??[];a.push(ms);phase.set(name,a);});
   times.push(performance.now()-start);
   if(i%30===0)trace.push(foes.map(a=>[a.id,a.alert,a.intent?.kind,a.combatChoice,a.p.x,a.p.y,a.health,a.surrendered]));
  }
  assert.ok(times.length>0);
  assert.ok(foes.every(a=>Number.isFinite(a.p.x)&&Number.isFinite(a.p.y)&&Number.isFinite(a.health)));
  times.sort((a,b)=>a-b);
  const stats=a=>{a.sort((x,y)=>x-y);return {p50:q(a,.5),p95:q(a,.95),p99:q(a,.99),max:a.at(-1)};};
  rows.push({count,ticks:times.length,tickMs:stats(times),phase:s.phase,shots:s.nextShotId-1,identity,fingerprint:digest(trace),
   phases:Object.fromEntries([...phase].map(([key,values])=>[key,stats(values)]))});
 }finally{activateSite(null);}
}
const result={revision:process.env.GITHUB_SHA??'local',method:'synthetic open-field fixed-clock workload; CPU only',rows};
console.log('EB0 SCALE',JSON.stringify(rows.map(({identity,phases,...row})=>row)));
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
