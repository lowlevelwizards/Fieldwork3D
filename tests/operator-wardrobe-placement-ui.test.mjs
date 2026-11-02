import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('advanced carry editor refuses illegal mounting independent of kit inventory',()=>{
 const h=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.ok(h.includes('data-wardrobe-mount="medical"'));
 assert.ok(h.includes('data-wardrobe-mount="utility"'));
 assert.ok(h.includes('id="wardrobeMagazineOrder"'));
 assert.match(js,/candidate\.location!==item\.location/);
 assert.match(js,/long&&!candidate\.longAllowed/);
 assert.match(js,/previewCarry\(realKit,weaponId\)/);
});
