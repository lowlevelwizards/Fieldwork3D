import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,setRosterWardrobe,freshQuickPlayRoster}
 from '../src/breach-roster.ts';
import {initialWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
test('Quick Play cosmetic editor is separate from finite gameplay equipment',()=>{
 const original=initialRoster(),id=original.members[0].id;
 const look=setWardrobeStyle(initialWardrobe(),'top','acu-shirt');
 const changed=setRosterWardrobe(original,id,look);
 assert.equal(changed.members[0].wardrobe.styles.top,'acu-shirt');
 const after=freshQuickPlayRoster(changed);
 assert.equal(after.members[0].wardrobe.styles.top,'acu-shirt');
 assert.equal(after.members[0].loadout.slots.primary,
  initialRoster().members[0].loadout.slots.primary);
 assert.equal(setRosterWardrobe(original,'unknown',look),original);
});
