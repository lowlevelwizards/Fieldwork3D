import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('Campaign Pre-GO reuses its WebGL preview across operator and field changes',()=>{
 const prep=read('ui/campaign-pre-go-prep.ts');
 const preview=read('equipment-preview.ts');
 assert.match(prep,/if\(!preview\|\|!preview\.isReady\(\)\)/);
 assert.match(prep,/preview\.setOperatorId\(selected\.id\)/);
 assert.match(prep,/preview\.updateEquipment\(selected\.weapon/);
 assert.equal((prep.match(/new CampaignKitPreview\(/g)??[]).length,1);
 assert.doesNotMatch(prep,/if\(rebuildPreview\|\|!preview\)/);
 assert.doesNotMatch(prep,/render\((?:true|false)\)/);
 assert.match(prep,/preview\?\.dispose\(\);preview=null;/);
 assert.match(preview,/setOperatorId\(id:string\):void/);
 assert.match(preview,/attachHost\(host:HTMLElement,drawImmediately=true\)/);
});
