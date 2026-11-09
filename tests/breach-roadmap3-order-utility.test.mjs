import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {executeTacticalUtilityOrder} from '../src/breach-order-utility.ts';
const p={x:100,y:100};
const actor=(id,order)=>({id,name:id.toUpperCase(),side:'blue',health:4,
 p:{...p},plan:[order],syncReady:null,actionTimer:0,velocity:30,
 magazine:0,weapon:'carbine',reload:0,flashCharges:1,lastThrowAt:-1});
function harness(operators=[]){
 const s={operators,doors:[],flashRemaining:2,grenades:[],
  nextEffectId:100,seconds:2};
 const events=[],done=[];
 const h={pop:a=>{done.push(a.id);a.plan.shift();a.actionTimer=0;},
  notify:(_s,e)=>events.push(e),beginReload:()=>true,
  fail:(_s,_a,_n,e)=>events.push(e),clearIssue:a=>{a.orderIssue=null;},
  rotate:()=>true,battleEvent:(_s,kind)=>events.push(kind)};
 return {s,h,events,done};
}
test('SYNC completes together when all living participants signal the same code',()=>{
 const n={kind:'sync',syncCode:'A',p};const a=actor('rook',n),b=actor('moss',{...n});
 const x=harness([a,b]);
 assert.equal(executeTacticalUtilityOrder(x.s,a,n,1/60,x.h),true);
 assert.equal(x.done.length,0);
 executeTacticalUtilityOrder(x.s,b,b.plan[0],1/60,x.h);
 assert.deepEqual(x.done,['rook','moss']);
 assert.ok(x.events.includes('GO CODE A'));
});
test('RELOAD starts once and completes when its timer resolves',()=>{
 const n={kind:'reload',p},a=actor('rook',n),x=harness([a]);
 executeTacticalUtilityOrder(x.s,a,n,1/60,x.h);
 assert.ok(a.actionTimer>0);assert.equal(x.done.length,0);
 executeTacticalUtilityOrder(x.s,a,n,1/60,x.h);
 assert.deepEqual(x.done,['rook']);
});
test('FLASH spends exactly one charge and emits one projectile after .3 seconds',()=>{
 activateSite({walls:[],cover:[],doors:[]});
 try{
  const n={kind:'flash',p,aimPoint:{x:165,y:100}};
  const a=actor('rook',n),x=harness([a]);
  for(let i=0;i<17;i++)executeTacticalUtilityOrder(x.s,a,n,1/60,x.h);
  assert.equal(x.s.grenades.length,0);
  executeTacticalUtilityOrder(x.s,a,n,1/60,x.h);
  assert.equal(x.s.grenades.length,1);
  assert.equal(a.flashCharges,0);assert.equal(x.s.flashRemaining,1);
  assert.equal(x.s.grenades[0].id,100);
  assert.deepEqual(x.done,['rook']);
 }finally{activateSite(null);}
});
