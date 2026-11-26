import test from 'node:test';
import assert from 'node:assert/strict';
import {COVERING_FAMILIES,normalizeWindowCovering,windowCoveringPieces,windowCoveringSpecimens} from '../src/breach-window-coverings.ts';
import {initializeWindows,manipulateWindow} from '../src/breach-windows.ts';
import {windowBarrierFootprint,windowApertureSegment} from '../src/worldgen/window-geometry-contract.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
const w={id:'W1',x:100,y:100,width:52,vertical:false,style:'standard',sillHeight:14,headHeight:43};
test('legacy curtain and independent immutable pane state',()=>{
 const authored={...w,treatment:'open-curtains'},c=normalizeWindowCovering(authored);
 assert.equal(c.family,'curtain');assert.equal(c.opening,1);assert.ok(Object.isFrozen(c));
 assert.equal(authored.covering,undefined);
 for(const treatment of ['bars','boarded','none'])assert.equal(normalizeWindowCovering({...w,treatment}),undefined);
 const explicit={family:'roller-shade',side:-1,opening:.5,palette:'linen'};
 assert.equal(normalizeWindowCovering({...authored,covering:explicit}).family,'roller-shade');
 const [state]=initializeWindows([{...w,covering:explicit}]),before=state.covering;
 assert.notStrictEqual(before,explicit);manipulateWindow(state,'break');
 assert.strictEqual(state.covering,before);assert.equal(state.shattered,true);
});
test('bounded deterministic geometry across six families, faces, states and aperture sizes',()=>{
 for(const family of COVERING_FAMILIES)for(const vertical of [false,true])for(const side of [-1,1])
 for(const opening of [0,.25,.5,1])for(const tilted of [false,true])
 for(const dims of [{width:52,sillHeight:14,headHeight:43},{width:88,sillHeight:0,headHeight:50}]){
  const window={...w,...dims,vertical};
  const c=normalizeWindowCovering({...window,covering:{family,side,opening,tilted,palette:'linen'}});
  const pieces=windowCoveringPieces(window,c);
  assert.deepEqual(pieces,windowCoveringPieces(window,c));assert.ok(pieces.length>0&&pieces.length<=14,family);
  for(const p of pieces){assert.ok([p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0].every(Number.isFinite));assert.ok(p.w>0&&p.h>0&&p.d>0);assert.ok(p.z*side>0);}
  assert.deepEqual(windowBarrierFootprint({...window,covering:c}),windowBarrierFootprint(window));
  assert.deepEqual(windowApertureSegment({...window,covering:c}),windowApertureSegment(window));
  assert.deepEqual(windowCoveringPieces(window,{...c,integrity:0}),[]);
 }
});
test('all 36 gallery specimens have unique entries',()=>{
 const specimens=windowCoveringSpecimens(),ids=new Set(assetLibrary().map(a=>a.id));
 assert.equal(specimens.length,36);assert.equal(new Set(specimens.map(s=>s.id)).size,36);
 for(const s of specimens)assert.ok(ids.has(s.id));
});
