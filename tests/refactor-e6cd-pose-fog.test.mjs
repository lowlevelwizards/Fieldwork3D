/** E6.2/E6.3: parity gates for presentation CPU optimizations.
 * These are Node contract checks, not real-device GPU/FPS measurements. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team} from '../src/breach-game.ts';
import {fogFingerprint,fogSessionFingerprint}
  from '../src/breach-fog-cache.ts';

const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const fogCode=readFileSync(new URL('../src/breach-fog-cache.ts',import.meta.url),'utf8');
const perfLoop=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
const legacy=(s)=>[s.mode,s.seed??'none',s.seenCount,
  s.seenRevision??0,s.revision,
  ...s.actors.map(a=>[
    a.id,Math.round(a.x*10),Math.round(a.y*10),
    Math.round(a.heading*100),a.posture,a.health
  ].join(':')),
  ...s.doors.map(d=>d.id+':'+Math.round(d.fraction*100))
].join('|');

test('E6.3 fingerprint is byte-identical to former array-based writer',()=>{
 for(let seed=0;seed<120;seed++){
  const actors=Array.from({length:seed%9},(_,i)=>({
   id:'b'+i,x:(seed-60)*.173+i*.217,y:19-seed*.64+i*.23,
   heading:(seed*17+i*19)*.036,posture:i%2?'crouch':'stand',
   health:i%3
  }));
  const doors=Array.from({length:seed%13},(_,i)=>({
   id:'d'+i,fraction:(seed*.031+i*.157)%1
  }));
  const state={mode:seed%2?'exterior-known':'true-blind',
   seed:seed%3===0?null:seed,seenCount:seed%41,
   seenRevision:seed%4===0?undefined:seed*2,
   revision:seed*3,actors,doors};
  assert.equal(fogFingerprint(state),legacy(state));
 }
});
test('E6.3 direct session signature retains order, door, mode and hidden-contact policy',()=>{
 const s=newSession(0,4096,'true-blind','small');
 const expected=()=>legacy({
  mode:s.intel.mode,seed:s.site?.seed??null,
  seenCount:s.seenGround.size,seenRevision:s.seenGroundRevision,
  revision:s.objectRevision,
  actors:s.operators.filter(a=>a.side==='blue'&&a.health>0).map(a=>({
   id:a.id,x:a.p.x,y:a.p.y,heading:a.heading,
   posture:a.posture,health:a.health
  })),
  doors:s.doors.map(d=>({id:d.id,
   fraction:d.openFraction??(d.open?1:0)}))
 });
 assert.equal(fogSessionFingerprint(s),expected());
 for(const a of team(s)){a.heading+=.123;a.p.x+=.45;}
 assert.equal(fogSessionFingerprint(s),expected());
 s.seenGroundRevision++;
 assert.equal(fogSessionFingerprint(s),expected());
 s.intel.mode='exterior-known';
 assert.equal(fogSessionFingerprint(s),expected());
 const red=s.operators.find(a=>a.side==='red');
 if(red){const before=fogSessionFingerprint(s);red.heading+=1.45;
  assert.equal(fogSessionFingerprint(s),before,
   'undisclosed hostile pose never becomes fog fingerprint intel');}
 assert.doesNotMatch(fogCode,/s\.operators\.filter\(/);
});

test('E6.2 squared radii match original two hypot thresholds',()=>{
 const near=(x,y,r)=>x*x+y*y<r*r;
 const old=(x,y,r)=>Math.hypot(x,y)<r;
 for(const r of [40,90]){
  for(let x=-110;x<=110;x+=2.75){
   for(let y=-110;y<=110;y+=3.25)
    assert.equal(near(x,y,r),old(x,y,r));
  }
  for(const x of [-r,-r-1,-r+1,0,r-1,r,r+1])
   assert.equal(near(x,0,r),old(x,0,r));
 }
 assert.match(scene,/stackX\*stackX\+stackY\*stackY<40\*40/);
 assert.match(scene,/safetyX\*safetyX\+safetyY\*safetyY<90\*90/);
 assert.match(scene,/this\.actorPhaseCosts\.posePrepMs\+=poseStart-posePrepStart/);
});

test('E6.1 contact protections and E6.3 fog render responsibilities remain intact',()=>{
 assert.match(scene,/let coldPrewarmBuilt=0;/);
 assert.match(scene,/shouldPrewarmContactRig\(\{/);
 assert.match(scene,/withinContactPrewarmBudget\(true,coldPrewarmBuilt\)/);
 assert.match(scene,/if\(!visible&&!this\.actors\.has\(actor\.id\)&&!prewarmHostile\)continue;/);
 assert.match(scene,/object\.root\.visible=visible;/);
 assert.match(scene,/paintFogMemory\(this\.fogMemoryContext,s,this\.fogDiagnostic\)/);
 assert.match(scene,/paintFogVisibility\(this\.fogContext,s\)/);
 assert.match(scene,/this\.fogRefresh\.poll\(s,dt,/);
 assert.match(fogCode,/signature!==this\.signature/);
 assert.match(scene,/this\.fogTexture\.needsUpdate=true;/);
 assert.match(scene,/this\.fogTextureUpdateRequests\+\+;/);
 assert.match(scene,/fogTextureBytesPerRequest:this\.fogCanvas\.width\*this\.fogCanvas\.height\*4/);
 assert.match(scene,/fogComposeMs:this\.profileSceneUpdate\?this\.fogComposeMs:null/);
 assert.match(scene,/this\.smoothFog\.visible=!omniscient&&!clippedExteriorFog/);
 assert.ok(perfLoop.includes('E6 POSE PREP/SOLVE'));
 assert.ok(perfLoop.includes('E6 FOG COMPOSE'));
 assert.ok(perfLoop.includes('RGBA REQUEST'));

});
