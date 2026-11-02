import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('outfit library validates before importing and stores only sandbox recipes',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const id of ['outfitName','outfitSave','outfitSelect','outfitLoad',
 'outfitTransfer','outfitExport','outfitImport'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(lab,/readWardrobeLooks/);
 assert.match(lab,/importWardrobeLook\(outfitTransfer\.value\)/);
 assert.match(lab,/makeWardrobeLook\(outfitName\.value,labKit,wardrobeOptions\)/);
 assert.match(lab,/MAX_WARDROBE_LOOKS/);
});
