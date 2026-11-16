import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldPrewarmContactRig,withinContactPrewarmBudget,
 MAX_COLD_CONTACT_RIGS_PER_FRAME}
 from '../src/rendering/breach-contact-rig-prewarm.ts';
import {runColdContactPrewarmStudy}
 from '../scripts/verification/e6-cold-contact-prewarm.mjs';

const candidate={phase:'planning',started:false,side:'red',
 visible:false,hasRig:false,historical:false};

test('E6.1 at most one hidden hostile is prepared per scene submission',()=>{
 assert.equal(MAX_COLD_CONTACT_RIGS_PER_FRAME,1);
 let built=new Set();
 const ids=['guard0','guard1','guard2','guard3'];
 const draw=()=>{let count=0;for(const id of ids){
  const eligible=shouldPrewarmContactRig({...candidate,hasRig:built.has(id)});
  if(withinContactPrewarmBudget(eligible,count)){
   built.add(id);count++;
  }
 }return count;};
 for(let i=0;i<ids.length;i++){
  assert.equal(draw(),1);
  assert.equal(built.size,i+1);
 }
 assert.equal(draw(),0,'fully prepared roster should not rebuild');
});
test('E6.1 never prewarms historical, started, visible or friendly rigs',()=>{
 for(const change of [
  {phase:'running'},{started:true},{side:'blue'},
  {visible:true},{historical:true},{hasRig:true}
 ])assert.equal(withinContactPrewarmBudget(
  shouldPrewarmContactRig({...candidate,...change}),0),false);
 assert.equal(withinContactPrewarmBudget(true,1),false);
 assert.equal(withinContactPrewarmBudget(true,0),true);
 assert.equal(withinContactPrewarmBudget(true,-1),false);
 assert.equal(withinContactPrewarmBudget(true,0,0),false);
});
test('E6.1 tactical scene integrates the bounded cold-only allowance',()=>{
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(scene,/let coldPrewarmBuilt=0;\s*for\(const actor of s\.operators\)/);
 assert.match(scene,/const prewarmHostile=shouldPrewarmContactRig/);
 assert.match(scene,/withinContactPrewarmBudget\(true,coldPrewarmBuilt\)/);
 assert.match(scene,/if\(prewarmHostile\)coldPrewarmBuilt\+\+/);
 assert.match(scene,/if\(!visible&&!this\.actors\.has\(actor\.id\)&&!prewarmHostile\)continue/);
 assert.match(scene,/if\(!this\.actors\.has\(actor\.id\)\)\{/);
 assert.match(scene,/if\(!object\.root\.visible&&!prewarmHostile\)\{/);
});
test('E6.0 actual cold rigs preserve assembled appearance and weapon identity',()=>{
 const study=runColdContactPrewarmStudy({hostiles:2});
 assert.deepEqual(study.simultaneous.builtPerFrame,[2]);
 assert.deepEqual(study.distributed.builtPerFrame,[1,1]);
 assert.equal(study.coldAppearanceParity,true);
 assert.ok(study.distributed.rigResults.every(([,r])=>r.visible===false));
 assert.ok(study.distributed.rigResults.every(([,r])=>r.partCount>0));
});
