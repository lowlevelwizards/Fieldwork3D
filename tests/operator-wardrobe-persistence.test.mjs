import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,freshQuickPlayRoster,
 serializeQuickPlayCosmetics,readRoster} from '../src/breach-roster.ts';
import {initialWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
test('Quick Play retains a cosmetic look but discards mission equipment',()=>{
 const prior=initialRoster();
 prior.members[0].wardrobe=setWardrobeStyle(initialWardrobe(),'top','flannel');
 prior.members[0].reserve=0;prior.members[0].injuries=2;
 const fresh=freshQuickPlayRoster(prior);
 assert.equal(fresh.members[0].wardrobe.styles.top,'flannel');
 assert.ok(fresh.members[0].reserve>0);
 assert.equal(fresh.members[0].injuries,0);
 const encoded=serializeQuickPlayCosmetics(prior);
 const parsed=readRoster(encoded);
 assert.equal(parsed.members[0].wardrobe.styles.top,'flannel');
 assert.ok(parsed.members[0].reserve>0);
});
