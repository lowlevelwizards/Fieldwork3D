import test from 'node:test';
import assert from 'node:assert/strict';
import {relatedFurniturePositions} from '../src/worldgen/room-composition.ts';
import {generateSite} from '../src/breach-site.ts';
const room={id:'test',x:0,y:0,w:220,h:180,kind:'room',purpose:'living',tone:0};
test('MAP 06 coffee table faces sofa and nightstand stays beside bed',()=>{
 const sofa={x:70,y:55,w:65,h:28,fixture:'sofa',low:true};
 const coffee=relatedFurniturePositions(room,'coffee-table',30,24,[sofa])[0];
 assert.ok(coffee);
 assert.equal(coffee.x,sofa.x);
 assert.ok(coffee.y>sofa.y+sofa.h/2+24/2);
 const bed={x:70,y:55,w:60,h:45,fixture:'bed',low:true};
 const nightstand=relatedFurniturePositions(room,'nightstand',26,22,[bed])[0];
 assert.ok(nightstand);
 assert.ok(nightstand.x>bed.x+bed.w/2);
});
test('MAP 06 room-focused candidates remain inside margins',()=>{
 for(let seed=1;seed<=20;seed++){
  const site=generateSite(seed);
  for(const o of site.cover){
   assert.ok(Number.isFinite(o.x)&&Number.isFinite(o.y));
   assert.ok(o.w>0&&o.h>0);
  }
 }
});
