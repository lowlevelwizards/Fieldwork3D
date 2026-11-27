import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialSecondaryEquipment} from '../src/secondary-equipment.ts';
import {quoteUnifiedLoadout,unifiedLoadoutInput,nativeMagazineDimensions} from '../src/equipment-unified-loadout.ts';
test('BT4 loadout adapter conserves issued identities, counts and source JSON',()=>{
 const kit=initialEquipmentLoadout();kit.secondary=initialSecondaryEquipment('test','glock-g19-gen3');
 kit.fieldInventory={version:1,stacks:[{itemId:'flashbang',quantity:2,location:'rig'},{itemId:'flashbang',quantity:1,location:'belt'}]};
 const magazines=[{id:'a',weapon:'carbine',rounds:7,location:'rig'},{id:'b',weapon:'carbine',rounds:13,location:'belt'}];
 const wardrobe=initialWardrobe(),source={kit,wardrobe,magazines,primaryPart:'ar-mag30'};
 const before=JSON.stringify(source),{input,manifest}=quoteUnifiedLoadout(source);
 assert.equal(JSON.stringify(source),before);
 assert.equal(input.items.filter(i=>i.kind==='flash').length,3);
 assert.equal(input.items.filter(i=>i.kind==='secondary-mag').length,2);
 assert.equal(input.items.filter(i=>i.kind==='radio').length,1);
 assert.deepEqual([...manifest.placements.flatMap(p=>p.itemIds),...manifest.unplaced.map(p=>p.id)].sort(),input.items.map(i=>i.id).sort());
});
test('BT4 source adapter does not grant hydration or cosmetic belt alias capacity',()=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'rig','rig-none');kit=setEquipmentChoice(kit,'armor','armor-none');
 const wardrobe=initialWardrobe();wardrobe.styles.packStyle='hydration';wardrobe.styles.beltStyle='padded-belt';
 const input=unifiedLoadoutInput({kit,wardrobe,magazines:[]});
 assert.equal(input.belt,'duty-belt');
 assert.equal(input.storage.filter(s=>s.carrier==='backpack').length,0);
 assert.equal(input.storage.filter(s=>s.carrier==='armor').length,0);
 assert.equal(input.storage.filter(s=>s.carrier==='rig').length,0);
});
test('BT4 native dimensions and unknown build handling',()=>{
 const d=nativeMagazineDimensions('ar-mag30');
 assert.ok(d.width>2&&d.height>4&&d.depth>1);
 assert.equal(nativeMagazineDimensions('no-such-art'),null);
});
