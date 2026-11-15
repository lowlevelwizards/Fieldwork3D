import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {saveStudioPreset,readStudioPresets,serializeStudioPresets,
 normalizeStudioPresetName,commitStudioPresetChange,outfitPresetForKit,
 STUDIO_PRESET_LIMIT} from '../src/operator-studio-presets.ts';
const wardrobe=()=>initialWardrobe();
test('A2-B preset storage refuses malformed wardrobe versions',()=>{
 const valid=wardrobe();
 const raw={version:1,presets:[{name:'Corrupt',wardrobe:{version:2}},
  {name:'Valid',wardrobe:valid},{name:'Missing',wardrobe:{}},
  {name:'Array',wardrobe:[]}]};
 const result=readStudioPresets(raw);
 assert.deepEqual(result.map(p=>p.name),['Valid']);
 assert.equal(result[0].wardrobe.version,1);
});
test('A2-B failed persistence leaves old presets unchanged',()=>{
 const first=saveStudioPreset([],'First',wardrobe());
 const proposed=saveStudioPreset(first,'Second',wardrobe());
 let serialized='';
 const fail=commitStudioPresetChange(first,proposed,()=>{throw Error('Quota exceeded');});
 assert.equal(fail.saved,false);
 assert.deepEqual(fail.presets,first);
 const success=commitStudioPresetChange(first,proposed,value=>{serialized=value;});
 assert.equal(success.saved,true);
 assert.equal(success.presets.length,2);
 assert.deepEqual(readStudioPresets(serialized),success.presets);
});
test('A2-B eight preset cap still supports case-insensitive overwrite',()=>{
 let presets=[];
 for(let i=0;i<STUDIO_PRESET_LIMIT;i++)
  presets=saveStudioPreset(presets,'Look '+i,wardrobe());
 assert.equal(presets.length,8);
 const revised={...wardrobe(),headwearColor:'olive-drab'};
 const changed=saveStudioPreset(presets,'  LOOK   0 ',revised);
 assert.equal(changed.length,8);
 assert.equal(changed[0].wardrobe.headwearColor,'olive-drab');
 assert.equal(normalizeStudioPresetName('  LOOK   0 '),'LOOK 0');
 assert.equal(saveStudioPreset(changed,'Ninth',wardrobe()).length,8);
});
test('A2-B cosmetic headwear survives presets without granting equipment',()=>{
 const noProtection=setEquipmentChoice(initialEquipmentLoadout(),'head','head-none');
 const wanted={...wardrobe(),styles:{...wardrobe().styles,headwear:'pasgt'},
  helmetSetup:{version:1,cover:'fitted'},helmetField:{rails:true,light:true}};
 const requested=outfitPresetForKit(wanted,noProtection);
 assert.equal(requested.styles.headwear,'pasgt');
 assert.equal(requested.helmetField.rails,true);
 assert.equal(noProtection.slots.head,'head-none');
});
test('A2-B Studio controls commit preset changes before local mutation',()=>{
 const source=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 assert.match(source,/commitStudioPresetChange\(studioPresets,next,/);
 assert.doesNotMatch(source,/studioPresets=next;\s*if\(!persistStudioPresets/);
 assert.match(source,/presetSave\.disabled=readOnly\|\|comparingSaved\|\|saveInFlight;/);
 assert.match(source,/function restoreDraft\(/);
});
