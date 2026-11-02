import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Stage 0 pinned A/B is backed by two real operator rigs and an immutable kit snapshot',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(html,/id="pinLook"/);assert.match(html,/id="comparePinned"/);
 assert.match(lab,/slots:\{\.\.\.labKit\.slots\}/);
 assert.match(lab,/wardrobe:readWardrobe\(wardrobeOptions\)/);
 assert.match(lab,/variantBodies\.push\(body\)/);
 assert.match(lab,/body\.root\.position\.set\(x,0,0\)/);
 assert.match(lab,/LEFT: PINNED REFERENCE/);
 assert.match(lab,/endVariantComparison\(\)/);
});
