import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const gameSource=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
test('quiet simulation skips all five empty effect-array reassignments',()=>{
 for(const field of ['sparks','shots','noise','impactMarks','flashBursts'])
  assert.match(gameSource,new RegExp('if\\(s\\.'+field+
    '\\.length\\)\\s*s\\.'+field+'=s\\.'+field+'\\.filter\\('));
 const s=newSession(0,816,'full-view');
 try{
  const empty=['sparks','shots','noise','impactMarks','flashBursts'];
  for(const actor of s.operators){actor.health=0;actor.plan=[];}
  s.doors=[];s.civilians=[];s.phase='running';
  for(const field of empty)s[field]=[];
  const refs=empty.map(f=>s[f]);
  stepSession(s,1/60);
  for(let i=0;i<empty.length;i++){
   assert.strictEqual(s[empty[i]],refs[i],empty[i]+' allocated when empty');
   assert.equal(s[empty[i]].length,0);
  }
 }finally{activateSite(null);}
});
test('nonempty timed effects still advance and expire under same strict thresholds',()=>{
 const s=newSession(0,823,'full-view');
 try{
  for(const actor of s.operators){actor.health=0;actor.plan=[];}
  s.doors=[];s.civilians=[];s.phase='running';
  const h=1/60;
  s.sparks=[{age:.2-h*2},{age:.2-h*.5}];
  s.impactMarks=[{age:24-h*2},{age:24-h*.5}];
  s.flashBursts=[{age:.7-h*2},{age:.7-h*.5}];
  s.shots=[];
  s.noise=[];
  stepSession(s,h);
  assert.equal(s.sparks.length,1);
  assert.equal(s.impactMarks.length,1);
  assert.equal(s.flashBursts.length,1);
  assert.ok(Math.abs(s.sparks[0].age-(.2-h))<1e-10);
  assert.ok(Math.abs(s.impactMarks[0].age-(24-h))<1e-10);
  assert.ok(Math.abs(s.flashBursts[0].age-(.7-h))<1e-10);
 }finally{activateSite(null);}
});
