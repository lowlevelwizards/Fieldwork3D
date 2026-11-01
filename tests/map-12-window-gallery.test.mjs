import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
test('MAP 12 rendered window families are inspectable and maintain true panes',()=>{
 const ids=new Set(assetLibrary().map(x=>x.id));
 for(const style of ['standard','tall','picture','bay','industrial'])
   assert.ok(ids.has('window:'+style));
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/asset-lab-main.ts',import.meta.url),'utf8');
 assert.ok(scene.includes('const style=opening.style'));
 assert.ok(scene.includes('this.windowGlass.set(opening.id,glass)'));
 assert.ok(lab.includes("item.id.startsWith('window:')"));
});
