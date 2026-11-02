import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('both campaign and Quick Play expose cosmetic accessory controls',()=>{
 const campaign=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 const quick=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(campaign,/COSMETIC EMPTY POUCHES/);
 assert.match(quick,/EMPTY \/ COSMETIC ATTACHMENTS/);
 assert.match(campaign,/wardrobe\.accessories\[slot\]/);
 assert.match(quick,/currentWardrobe\.accessories\[slot\]/);
});
