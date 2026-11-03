import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle,setWardrobeFabricCamo,
 resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {STUDIO_PRESET_LIMIT,readStudioPresets,saveStudioPreset,
 deleteStudioPreset,serializeStudioPresets,outfitPresetForKit}
 from '../src/operator-studio-presets.ts';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('appearance-only presets round trip, replace names, reject invalid records',()=>{
 const original=initialWardrobe();
 const w=setWardrobeStyle(original,'top','combat-shirt');
 const presets=saveStudioPreset([], ' Woodland   Scout ',w);
 assert.equal(presets.length,1);
 assert.equal(presets[0].name,'Woodland Scout');
 assert.equal(presets[0].wardrobe.styles.top,'combat-shirt');
 const again=saveStudioPreset(presets,'woodland scout',
  setWardrobeStyle(original,'top','acu-shirt'));
 assert.equal(again.length,1,'case-insensitive names update, not duplicate');
 assert.equal(again[0].wardrobe.styles.top,'acu-shirt');
 assert.deepEqual(readStudioPresets(serializeStudioPresets(again)),again);
 assert.deepEqual(readStudioPresets('bad JSON'),[]);
 assert.deepEqual(readStudioPresets({version:2,presets:again}),[]);
 assert.deepEqual(deleteStudioPreset(again,'WOODLAND SCOUT'),[]);
 let capped=[];
 for(let i=0;i<STUDIO_PRESET_LIMIT+2;i++)
  capped=saveStudioPreset(capped,'Look '+i,w);
 assert.equal(capped.length,STUDIO_PRESET_LIMIT);
});
test('applying a saved preset never invents equipment or incompatible garments',()=>{
 const base=initialEquipmentLoadout();
 const restricted=setEquipmentChoice(base,'head','head-none');
 const wanted=setWardrobeStyle(initialWardrobe(),'headwear','ach');
 const saved=outfitPresetForKit(wanted,restricted);
 assert.equal(saved.styles.headwear,undefined,'helmet not granted by cosmetic preset');
 const outfit=resolvedWardrobe(saved,restricted);
 assert.equal(outfit.headwear,'bare');
 assert.equal(restricted.slots.head,'head-none');
 const w=setWardrobeStyle(initialWardrobe(),'top','combat-shirt');
 const chosen=setWardrobeFabricCamo(w,'top','multicam',resolvedWardrobe(w,base));
 const compatible=outfitPresetForKit(chosen,base);
 assert.equal(compatible.fabricCamo?.top,'multicam');
 const inappropriate=setWardrobeStyle(initialWardrobe(),'top','gorka-jacket');
 const invalid={...inappropriate,fabricCamo:{top:'desert-marpat'}};
 const filtered=outfitPresetForKit(invalid,base);
 assert.equal(filtered.fabricCamo?.top,undefined);
});
test('Studio has six readable primary categories and contextual controls',()=>{
 const studio=read('../src/operator-studio.ts');
 const html=read('../operator-studio.html');
 const css=read('../src/operator-studio.css');
 const grid=read('../src/operator-appearance-grid.ts');
 assert.equal((studio.match(/label:'(?:HEAD|TOPS|LEGS|ARMOR|GEAR|DETAILS)'/g)??[]).length,6);
 for(const id of ['studioCompare','studioUndo','studioReset','studioPresetSelect',
   'studioPresetSave','studioMatchSet','studioSubcategories'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(studio,/outfitPresetForKit\(/);
 assert.match(studio,/last saved look/i);
 assert.match(studio,/canCopyPrint\?'CAMOUFLAGE'/);
 assert.match(studio,/setWardrobeFabricSolid\(current\(\),channel,sourceSolid\)/);
 assert.match(studio,/studioRoot.dataset.comparing/);
 assert.match(css,/\.studio-more-panel/);
 assert.match(grid,/this\.liveContext/);
 assert.match(grid,/this\.previewIdentity/);
 assert.match(grid,/JSON\.stringify\(this\.wardrobe\)/);
 assert.ok(!grid.includes("item.id==='acu-shirt'?'scorpion-w2'"),
  'Studio cards must not inject a demo print');
});
