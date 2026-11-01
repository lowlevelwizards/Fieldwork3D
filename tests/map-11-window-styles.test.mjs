import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {initializeWindows,openingStyle} from '../src/breach-windows.ts';
test('MAP 11 window kinds are deterministic and keep physical sills',()=>{
 const accepted=new Set(['standard','tall','picture','bay','industrial']);
 let found=0;
 for(let seed=1;seed<=60;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.windows,b.windows);
  for(const w of a.windows??[]){
    found++;
    assert.ok(accepted.has(w.style));
    assert.ok(a.cover.some(c=>c.fixture==='window-sill'&&
      Math.hypot(c.x-w.x,c.y-w.y)<1));
  }
  const states=initializeWindows(a.windows??[]);
  for(const w of states)
    if(w.style==='picture')assert.equal(w.operable,false);
 }
 assert.ok(found>0);
 assert.equal(openingStyle('garage',15,0),'standard');
});
