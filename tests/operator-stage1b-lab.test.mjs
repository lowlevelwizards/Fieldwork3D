import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('bare modeling pose is a true neutral reference; ADS alignment needs a real gun',()=>{
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.ok(rig.includes('if(!p.unarmedPreview&&handling'));
 assert.ok(rig.includes('const sightEngagement=p.unarmedPreview?0:'));
 assert.ok(rig.includes('r.chest.rotation.x=0;'));
 assert.ok(rig.includes('r.chest.rotation.z=0;'));
 assert.ok(rig.includes('r.hip.rotation.x=0;'));
});
test('Lab calls new shapes cuboids and offers contextual swatches without changing headgear shapes',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(html,/HEADGEAR \/ SOLID COLORS/);
 assert.match(html,/id="headwearColorGrid"/);
 assert.match(lab,/rectilinear cuboid silhouette/);
 for(const id of ['boonie','beanie','pasgt','soviet-steel'])
  assert.ok(html.includes('data-head-silhouette="'+id+'"'),id+' in headgear lab');
 assert.match(lab,/selectWardrobeItem\(bareLabEquipment\(\)/);
});
