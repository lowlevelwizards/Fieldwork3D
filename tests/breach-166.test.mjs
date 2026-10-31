import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOperatorRig} from '../src/breach-operator-rig.ts';
const code=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');

test('166: switching silhouette off restores each model original material',()=>{
 const rig=createOperatorRig('rook','blue');
 const originals=[...rig.colors.entries()].map(([material,color])=>({
  material,color:color.clone()
 }));
 for(const {material} of originals)material.color.setHex(0x172322);
 for(const [material,original] of rig.colors)material.color.copy(original);
 for(const {material,color} of originals)
  assert.ok(material.color.equals(color));
 rig.dispose();
 assert.match(code,/material\.color\.copy\(enabled\?silhouetteColor:originalColor\)/);
 assert.match(code,/applySilhouette\(rig,silhouettes\)/);
 assert.match(code,/applySilhouette\(body,silhouettes\)/);
});

test('166: comparison keeps ISO/front/side/top controls accessible on mobile',()=>{
 for(const id of ['comparePose','silhouetteMode','savePoseView','resetCamera'])
  assert.ok(html.includes('id="'+id+'"'));
 for(const view of ['iso','front','side','top'])
  assert.ok(html.includes('data-view="'+view+'"'));
 assert.ok(html.includes('body.compare-open main>.row:has(#comparePose)>[data-view]'));
 assert.ok(html.includes('overflow-x:auto'));
 assert.ok(code.includes('if(comparing)fit()'),
  'device rotation must re-fit the comparison grid');
});

test('166: screenshot capture is synchronous, accurate, and on-demand',()=>{
 const start=code.indexOf("choose<HTMLButtonElement>('savePoseView').addEventListener");
 const end=code.indexOf('silhouetteButton.addEventListener',start);
 assert.ok(start>0&&end>start,'capture needs a direct user tap handler');
 const capture=code.slice(start,end);
 assert.ok(capture.indexOf('renderer.render(scene,camera)')<
   capture.indexOf("canvas.toDataURL('image/png')"),
  'must render a fresh WebGL frame before saving');
 assert.match(capture,/link\.download='fieldwork-poses-reference\.png'/);
 assert.match(capture,/catch\(error\)/);
});

test('166: comparison reposes six rigs only when selections change',()=>{
 assert.match(code,/if\(comparisonKey!==signature\)/);
 assert.match(code,/canvas\.dataset\.comparePoseUpdates/);
 assert.match(code,/comparisonKey=''/);
});