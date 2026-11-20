import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {equipmentPreviewVisualKey} from '../src/equipment-preview-visual-key.ts';

const signature=(id,kit,seed=7,mags=[],wardrobe)=>equipmentPreviewVisualKey(
 id,'carbine',seed,kit,undefined,mags,wardrobe);

test('identical visual equipment does not cause redundant preview invalidation',()=>{
 const kit=initialEquipmentLoadout('carbine');
 assert.equal(signature('rook',kit),signature('rook',{
  ...kit,slots:{...kit.slots},
  fieldInventory:kit.fieldInventory?structuredClone(kit.fieldInventory):undefined,
  secondary:kit.secondary?structuredClone(kit.secondary):undefined
 }));
 assert.notEqual(signature('rook',kit),signature('viper',kit),
  'operator switches must refresh the model and thumbnail ownership');
 assert.notEqual(signature('rook',kit),signature('rook',kit,8));
});

test('in-place equipment, field inventory, magazine and wardrobe edits invalidate',()=>{
 const kit=initialEquipmentLoadout('carbine');
 const first=signature('rook',kit);
 kit.slots.head='head-none';
 assert.notEqual(signature('rook',kit),first);
 const second=signature('rook',kit);
 const inventory=kit.fieldInventory;
 assert.ok(inventory);
 inventory.stacks.push({itemId:'wedge',quantity:1,location:'rig'});
 assert.notEqual(signature('rook',kit),second);
 const mags=[{id:'mag-1',location:'rig',rounds:30}];
 const before=signature('rook',kit,7,mags);
 mags[0].rounds=29;
 assert.notEqual(signature('rook',kit,7,mags),before);
 const clothing={styles:{top:'field'}};
 const wardrobeBefore=signature('rook',kit,7,[],clothing);
 clothing.styles.top='casual';
 assert.notEqual(signature('rook',kit,7,[],clothing),wardrobeBefore);
});

test('preview reuses value fingerprint and caps readback thumbnail data URLs',()=>{
 const src=readFileSync(new URL('../src/equipment-preview.ts',import.meta.url),'utf8');
 assert.match(src,/equipmentPreviewVisualKey\(this\.operatorId,weapon,appearanceSeed,/);
 assert.match(src,/if\(key===this\.visualKey\)return;/);
 assert.match(src,/if\(key===this\.visualKey\)return;/);
 assert.match(src,/this\.visualKey=key;[\s\S]*?this\.thumbnailRevision\+\+;[\s\S]*?this\.modelThumbCache\.clear\(\)/);
 assert.match(src,/this\.rememberThumbnail\(key,result\)/);
 assert.match(src,/this\.rememberThumbnail\(key,data\)/);
 assert.match(src,/MAX_THUMB_CACHE=96/);
 assert.match(src,/this\.modelThumbCache\.size>=CampaignKitPreview\.MAX_THUMB_CACHE/);
 assert.match(src,/this\.visualSnapshot=null;this\.visualKey=null/);
});
