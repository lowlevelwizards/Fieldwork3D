import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {styleArchitecturalDoors} from '../src/worldgen/door-families.ts';
import {doorBlocksSightRay,doorBlocksRay} from '../src/breach-core.ts';
test('MAP 13: every generated door finish has a real asset and retains mechanical authority',()=>{
 const variants=new Set(assetLibrary().filter(a=>a.id.startsWith('door:'))
   .map(a=>a.id.slice('door:'.length)));
 for(const type of ['wood','steel','reinforced','exit','glazed','french',
  'screen','barn','louvered','pocket','fire'])assert.ok(variants.has(type));
 let strong=0,glass=0,sliding=0;
 for(let seed=1;seed<=55;seed++){
  const site=generateSite(seed);
  for(const door of site.doors){
   assert.ok(variants.has(door.style),'known door finish: '+seed+' '+door.style);
   if(door.style==='reinforced'){
     strong++;
     assert.ok((door.frameIntegrity??0)>3);
     assert.ok((door.resistance??0)>2);
   }
   if(door.style==='fire'){
     assert.ok((door.frameIntegrity??0)>=4);
     assert.ok((door.resistance??0)>=1.8);
   }
   if(['glazed','french','screen','mesh-gate'].includes(door.style??''))glass++;
   if(door.style==='barn'||door.style==='pocket'){
     sliding++;assert.equal(door.kind,'sliding');
   }
  }
 }
 assert.ok(strong>0);
 assert.ok(glass>0);
 assert.ok(sliding>0);
});
test('final fire or barn construction controls resistance, not its precursor family',()=>{
 const base={id:'SERVICE',a:{x:60,y:100},b:{x:105,y:100},
   kind:'hinged',open:false,openedAt:-1};
 const fire=styleArchitecturalDoors({archetype:'clinic',doors:[base]},1).doors[0];
 assert.equal(fire.style,'fire');
 assert.ok(fire.frameIntegrity>=4);
 assert.ok(fire.resistance>=1.8);
 const barn=styleArchitecturalDoors({archetype:'garage',doors:[base]},4).doors[0];
 assert.equal(barn.style,'barn');
 assert.equal(barn.kind,'sliding');
 assert.ok((barn.resistance??0)<2,'barn cannot inherit reinforced frame');
});
test('transparent door finishes permit sight while retaining their physical leaf',()=>{
 const base={id:'FRONT',a:{x:80,y:90},b:{x:125,y:90},open:false,openedAt:-1,
   style:'glazed'};
 const ray={a:{x:100,y:60},b:{x:100,y:120}};
 assert.equal(doorBlocksSightRay([base],ray),false);
 assert.equal(doorBlocksRay([base],ray),true);
 assert.equal(doorBlocksSightRay([{...base,style:'steel'}],ray),true);
});
