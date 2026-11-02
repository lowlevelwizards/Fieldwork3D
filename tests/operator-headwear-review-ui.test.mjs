import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('first headwear review has four matched one-tap silhouettes without creating a second equipment category',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const id of ['bare','patrol-cap','ach','high-cut'])
  assert.match(html,new RegExp('data-head-silhouette="'+id+'"'));
 assert.match(js,/selectWardrobeItem\(bareLabEquipment\(\)/);
 assert.match(js,/weapon\.value='none'/);
 assert.match(js,/isolation\.value='head'/);
 assert.match(js,/frameWardrobeSelection\(\)/);
 assert.match(js,/chooseTrack\('idle'\)/);
 assert.match(html,/shape|silhouette|HEADWEAR SILHOUETTE/i);
});
