import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shower is a constructed enclosure with open entry and mounted plumbing',()=>{
 const src=read('src/worldgen/detailed-fixture-visuals.ts');
 const shower=src.split("case 'shower':")[1].split("case 'office-chair':")[0];
 assert.match(shower,/Rear plumbing wall/);
 assert.match(shower,/mixer/);
 assert.doesNotMatch(shower,/b\(0,H\*\.5,d\*\.47/);
});
test('office chair has supported arms and five radially mounted casters',()=>{
 const src=read('src/worldgen/detailed-fixture-visuals.ts');
 const chair=src.split("case 'office-chair':")[1].split("case 'computer':")[0];
 assert.match(chair,/for\(let n=0;n<5;n\+\+\)/);
 assert.match(chair,/horizontal arm pad/);
 assert.match(chair,/central lift/);
});
test('bike-rack hoops stand upright and use both ground anchors',()=>{
 const src=read('src/worldgen/fixture-visuals.ts');
 const rack=src.split("fixture==='bike-rack'")[1].split("fixture==='window-boards'")[0];
 assert.match(rack,/hoop\.rotation\.y=Math\.PI\/2/);
 assert.match(rack,/sign\*r/);
 assert.doesNotMatch(rack,/pipe\.rotation\.x=Math\.PI\/2/);
});
