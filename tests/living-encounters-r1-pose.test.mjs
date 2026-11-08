import test from 'node:test';
import assert from 'node:assert/strict';
import {armedPrecontactStyle,idleLifeAt}
 from '../src/breach-idle-life.ts';
const actor={side:'red',activity:'working',alert:'idle',velocity:0,
 aim:0,health:4};
test('LE1: only a stationary unalarmed armed actor receives ambient pose nuance',()=>{
 assert.equal(armedPrecontactStyle(actor),'observe');
 assert.equal(armedPrecontactStyle({...actor,activity:'watching'}),'watch');
 assert.equal(armedPrecontactStyle({...actor,activity:'resting'}),'relaxed');
 assert.equal(armedPrecontactStyle({...actor,activity:'seated'}),'relaxed');
 assert.equal(armedPrecontactStyle({...actor,activity:'patrolling'}),undefined);
 for(const changes of [{side:'blue'},{alert:'investigating'},
  {alert:'cover'},{alert:'engage'},{velocity:15},{aim:.5},
  {health:0},{surrendered:true},{reloading:true},
  {interacting:true},{activity:undefined}])
  assert.equal(armedPrecontactStyle({...actor,...changes}),undefined,
   JSON.stringify(changes));
});
test('LE1: deterministic idle nuances never produce weapon or locomotion updates',()=>{
 const t=9.5,seed=17;
 const base=idleLifeAt(t,seed,{speed:0});
 const watch=idleLifeAt(t,seed,{speed:0,precontact:'watch'});
 const observe=idleLifeAt(t,seed,{speed:0,precontact:'observe'});
 assert.equal(watch.breathe,base.breathe,'breathing cadence is shared');
 assert.ok(Math.abs(watch.glance)<Math.abs(base.glance));
 assert.ok(Math.abs(watch.sway)<Math.abs(base.sway));
 assert.ok(observe.headDip>0&&observe.headDip<.05);
 assert.deepEqual(observe,idleLifeAt(t,seed,{speed:0,precontact:'observe'}));
 for(const mode of ['watch','observe','relaxed']){
  const options={speed:0,precontact:mode};
  for(const blocking of [{speed:20},{aiming:true},{reloading:true},
   {firing:true},{down:true},{surrender:true},{interacting:true}]){
   const blocked=idleLifeAt(t,seed,{...options,...blocking});
   assert.equal(blocked.headDip,0);
   assert.equal(blocked.glance,0);
   assert.equal(blocked.sway,0);
  }
 }
});
