import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {advanceTransientSimulationEffects} from '../src/breach-simulation-phases.ts';
import {retainAtmosphereTails,ATMOSPHERE_LIMIT,PUFF_LIFE} from '../src/breach-atmosphere-evidence.ts';
import {samplePuff} from '../src/rendering/breach-dust-puffs.ts';
import {windowShardPose,settledWindowShardPose} from '../src/rendering/window-shatter-presentation.ts';
import {PRODUCTION_VFX} from '../src/rendering/breach-vfx-preview-config.ts';
import {generateSite} from '../src/breach-site.ts';
test('V15 dust lasts after original shot expiry without extending combat record lifetime',()=>{
 const s=newSession(),p={x:200,y:200};
 s.seconds=.41;s.shots=[{id:1,age:.39,start:{x:150,y:200},end:p,surface:'stone',impactHeight:24,muzzleHeight:30}];
 advanceTransientSimulationEffects(s,.02);
 assert.equal(s.shots.length,0);assert.equal(s.atmosphere.length,2);
 const dust=s.atmosphere.find(c=>c.kind==='stone'),a={};
 assert.ok(samplePuff(dust.kind,dust.id,.8,p.x,dust.height,p.y,a));
 assert.ok(a.size>12&&a.alpha>.2);
 const frame=snapshot(s);s.atmosphere[0].p.x=999;
 applyReplayFrame(s,frame);assert.equal(s.atmosphere[0].p.x,200);
 s.seconds=4;advanceTransientSimulationEffects(s,.02);assert.equal(s.atmosphere.length,0);
});
test('bounded cloud history, deterministic sample and no changes to shot identities',()=>{
 const s={seconds:.5,shots:Array.from({length:40},(_,id)=>({id,age:.39,start:{x:0,y:0},end:{x:10,y:0},surface:'wood'})),flashBursts:[]};
 const before=JSON.stringify(s.shots);retainAtmosphereTails(s,.02);
 assert.equal(s.atmosphere.length,ATMOSPHERE_LIMIT);assert.equal(JSON.stringify(s.shots),before);
 assert.equal(PUFF_LIFE.flash,3.2);
});
test('glass shards and settled debris are larger while the counts stay bounded',()=>{
 const w={x:50,y:50,width:40,vertical:false,shattered:true,shatteredAt:0};
 assert.ok(windowShardPose(w,.1,0).scale>=1.5);
 const out={};assert.ok(settledWindowShardPose(w,2,0,out));assert.ok(out.scale>=1.45&&out.heightScale>.5);
});
test('production grass/bush experiments retired and new outdoor shrub collision fixtures omitted',()=>{
 assert.equal(PRODUCTION_VFX.grass,false);assert.equal(PRODUCTION_VFX.bush,false);
 for(const seed of [3,17,61]){const site=generateSite(seed,'standard',undefined,{}, {archetype:'house'});
  assert.ok(!site.cover.some(c=>['shrub-round','shrub-tall','bush','hedge'].includes(c.fixture)&&
    !site.rooms.some(r=>c.x>=r.x&&c.x<=r.x+r.w&&c.y>=r.y&&c.y<=r.y+r.h)));
 }
});
