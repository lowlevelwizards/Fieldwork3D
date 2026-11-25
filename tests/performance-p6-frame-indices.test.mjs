import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RecentMuzzleShotFrameIndex,MAX_MUZZLE_FLASH_AGE,
 mostRecentActiveMuzzleShot,muzzleFlashCue}
 from '../src/breach-combat-cues.ts';
import {rebuildFrameIdIndex} from '../src/breach-frame-lookup.ts';

const shot=(id,shooterId,age)=>({id,shooterId,age,visible:id%3!==0});
const weapons=['carbine','smg','rifle','shotgun'];
const attachments=[null,'muzzle-suppressor','muzzle-hider'];
const lookup=(index,who,weapon,attachment)=>
 mostRecentActiveMuzzleShot(index.forShooter(who),who,weapon,attachment,
  s=>s.visible);
const baseline=(shots,who,weapon,attachment)=>
 mostRecentActiveMuzzleShot(shots,who,weapon,attachment,s=>s.visible);

test('P6.A: window exactly envelopes every current weapon flash lifetime',()=>{
 for(const weapon of weapons){
  assert.ok(MAX_MUZZLE_FLASH_AGE>=muzzleFlashCue(weapon,0).duration);
  assert.ok(!muzzleFlashCue(weapon,MAX_MUZZLE_FLASH_AGE).active);
 }
});
test('P6.A: same newest visible burst, historical future/expired shots, and unsorted entries',()=>{
 const index=new RecentMuzzleShotFrameIndex();
 const shots=[shot(1,'rook',.02),shot(2,'moss',.004),
  shot(3,'rook',-.0001),shot(4,'rook',.126),shot(5,'rook',.05),
  shot(6,'rook',.009),shot(7,'rook',.124),shot(8,'moss',.04),
  shot(9,'rook',.001),shot(10,'rook',0),shot(11,'rook',Infinity)];
 const original=structuredClone(shots);
 index.rebuild(shots);
 for(const who of ['rook','moss','ash'])
  for(const weapon of weapons)
   for(const muzzle of attachments)
    assert.equal(lookup(index,who,weapon,muzzle),
     baseline(shots,who,weapon,muzzle),[who,weapon,muzzle].join(' / '));
 assert.deepEqual(shots,original,'render-only indexing cannot mutate shot history');
});
test('P6.A: deterministic varied history parity, including hidden newest shots',()=>{
 const index=new RecentMuzzleShotFrameIndex();
 let seed=1387;
 const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let frame=0;frame<12;frame++){
  const shots=[];
  for(let n=0;n<380;n++){
   const age=rnd()*.42-.08;
   const s=shot(n,['rook','moss','ash','red','civilian'][Math.floor(rnd()*5)],age);
   s.visible=rnd()>.42;shots.push(s);
  }
  index.rebuild(shots);
  for(const shooter of ['rook','moss','ash','red','civilian','absent'])
   for(const weapon of weapons)
    for(const attachment of attachments)
     assert.equal(lookup(index,shooter,weapon,attachment),
      baseline(shots,shooter,weapon,attachment));
 }
});
test('P6.A: scene/shot indexing reuses no obsolete burst after seek or new session',()=>{
 const index=new RecentMuzzleShotFrameIndex();
 index.rebuild([shot(1,'rook',.02)]);
 assert.equal(index.forShooter('rook').length,1);
 index.rebuild([shot(2,'moss',.03)]);
 assert.equal(index.forShooter('rook').length,0);
 assert.equal(index.forShooter('moss')[0].id,2);
 index.clear();
 assert.equal(index.forShooter('moss').length,0);
});
test('P6.B: index preserves Array.find first-match identity, refreshes on replay',()=>{
 const index=new Map();
 const x={id:'door-a',value:1},duplicate={id:'door-a',value:2};
 const y={id:'door-b',value:3};
 rebuildFrameIdIndex(index,[x,duplicate,y]);
 assert.equal(index.get('door-a'),x);
 assert.equal(index.get('door-b'),y);
 rebuildFrameIdIndex(index,[duplicate]);
 assert.equal(index.get('door-a'),duplicate);
 assert.equal(index.has('door-b'),false);
});
test('P6.A–B: tactical renderer amortizes only presentation searches',()=>{
 const text=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(text,/recentMuzzleShots\.rebuild\(s\.shots\)/);
 assert.match(text,/recentMuzzleShots\.forShooter\(actor\.id\)/);
 assert.match(text,/rebuildFrameIdIndex\(this\.frameActorsById,s\.operators\)/);
 assert.match(text,/rebuildFrameIdIndex\(this\.frameDoorsById,s\.doors\)/);
 assert.match(text,/this\.frameDoorsById\.get\(actor\.lastDoorId\)/);
 assert.match(text,/this\.frameActorsById\.get\(actor\.targetId\)/);
 assert.match(text,/frameShotDisclosure\.forShot\(s,shot,omniscient,personalDisclosure,\s*p=>this\.presentationSight\.query\(s,'effect',shot\.id,p\)\)\.flash/);
});
