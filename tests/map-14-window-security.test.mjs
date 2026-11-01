import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
test('MAP 14 boarded windows have matching authoritative physical cover',()=>{
 const board=propDefinition('window-boards');
 assert.ok(board?.solid&&board.cover==='high');
 let treatmentCount=0,boards=0;
 for(let seed=1;seed<=75;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.windows,b.windows);
  for(const window of a.windows??[]){
   assert.ok(['none','open-curtains','bars','boarded'].includes(window.treatment));
   treatmentCount++;
   const physical=a.cover.filter(c=>c.fixture==='window-boards'&&
     Math.hypot(c.x-window.x,c.y-window.y)<1);
   if(window.treatment==='boarded'){
     boards++;
     assert.equal(physical.length,1);
     assert.equal(physical[0].low,false);
     assert.equal(physical[0].material,'softwood');
   }else assert.equal(physical.length,0);
  }
 }
 assert.ok(treatmentCount>0&&boards>0);
});
