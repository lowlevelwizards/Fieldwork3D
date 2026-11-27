import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWardrobe,readWardrobe,setWardrobeBeltSolid} from '../src/operator-wardrobe-data.ts';
import {beltSolidChoices} from '../src/operator-belt-profile.ts';
test('BT8 independent belt finishes round-trip without altering gear, pack or styles',()=>{
 const old={...initialWardrobe(),fabricSolids:{gear:'olive-drab',pack:'coyote'}};
 const w=setWardrobeBeltSolid(old,'plain-belt','brown');
 assert.equal(w.beltSolid,'brown');assert.deepEqual(w.fabricSolids,old.fabricSolids);
 assert.deepEqual(w.styles,old.styles);assert.equal(readWardrobe(JSON.parse(JSON.stringify(w))).beltSolid,'brown');
 assert.equal(setWardrobeBeltSolid(w,'plain-belt','medical-red'),w);
 assert.equal(setWardrobeBeltSolid(w,'plain-belt',null).beltSolid,undefined);
 assert.deepEqual(beltSolidChoices('no-belt'),[]);
 assert.equal(readWardrobe({...w,beltSolid:'invalid'}).beltSolid,undefined);
});
