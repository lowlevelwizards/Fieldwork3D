import test from 'node:test';import assert from 'node:assert/strict';
import {relatedFurniturePositions} from '../src/worldgen/room-composition.ts';
import {generateSite} from '../src/breach-site.ts';
test('lounge objects get multiple true sofa-relative alternatives',()=>{
 const room={id:'living',kind:'room',purpose:'living',tone:0,x:0,y:0,w:230,h:210};
 const sofa={x:110,y:100,w:65,h:28,fixture:'sofa'};
 const coffee=relatedFurniturePositions(room,'coffee-table',30,24,[sofa]);
 assert.ok(coffee.length>=3);
 assert.ok(coffee.every(p=>p.x>0&&p.x<230&&p.y>0&&p.y<210));
});
test('dining tables and chairs remain reproducible with center-first placement',()=>{
 for(const seed of [120,126,128]){
  const s=generateSite(seed);
  assert.deepEqual(s.cover,generateSite(seed).cover);
  assert.ok(s.cover.every(o=>o.w>0&&o.h>0));
 }
});
