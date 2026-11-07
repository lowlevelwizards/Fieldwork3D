import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {WEAPON_ATTACHMENTS} from '../src/equipment-weapon-assemblies.ts';
import {ARSENAL_PLATFORMS,ARSENAL_REFERENCES,ARSENAL_CATEGORIES,ARSENAL_PARTS,
 arsenalCatalogIssues,arsenalPlatformForReceiver,arsenalPart,arsenalReferencesForPlatform}
 from '../src/arsenal/catalog.ts';

test('Arsenal catalog maps every authored factory model to a named platform',()=>{
 assert.deepEqual(arsenalCatalogIssues(),[]);
 assert.equal(ARSENAL_REFERENCES.length,FAMILY_PRESETS.length);
 for(const p of ARSENAL_REFERENCES){
  assert.equal(p.platformId,arsenalPlatformForReceiver(p.legacy.parts.receiver));
  assert.ok(ARSENAL_PLATFORMS.some(x=>x.id===p.platformId));
 }
 for(const platform of ARSENAL_PLATFORMS)
  assert.ok(arsenalReferencesForPlatform(platform.id).length>0);
});
test('G3, HK33 and MP5 browse separately despite the shared HK art family',()=>{
 assert.equal(arsenalPlatformForReceiver('hk-g3-drum'),'g3');
 assert.equal(arsenalPlatformForReceiver('hk33-556-rifle'),'hk33');
 assert.equal(arsenalPlatformForReceiver('hk-mp5-standard'),'mp5');
});
test('one physical stock slot: generic legacy attachment stocks are not duplicate body parts',()=>{
 assert.equal(ARSENAL_CATEGORIES.filter(c=>c.slots.includes('stock')).length,1);
 assert.equal(ARSENAL_PARTS.filter(x=>x.slot==='stock').length,
  Object.values(FAMILY_PARTS).filter(x=>x.slot==='stock').length);
 assert.ok(!ARSENAL_PARTS.some(x=>x.id==='stock-compact'));
 assert.ok(Object.keys(WEAPON_ATTACHMENTS).includes('stock-compact'),
  'old save attachment stock IDs must remain available to legacy readers');
});
test('short display names do not overwrite legacy IDs or baked material variants',()=>{
 assert.equal(arsenalPart('hk-mp5-retract-stock')?.name,'A3 Retractable');
 assert.equal(arsenalPart('hk33-retract-stock')?.name,'A3 Retractable');
 assert.equal(arsenalPart('ak-wood-red')?.name,'Red Lacquer');
 assert.equal(arsenalPart('ak-wood-amber')?.name,'Honey Birch');
 assert.equal(arsenalPart('hk-mp5sd-integrated')?.name,'SD Integrated');
 assert.match(arsenalPart('hk-mp5-retract-stock')?.detail??'',/twin-rail/);
});
