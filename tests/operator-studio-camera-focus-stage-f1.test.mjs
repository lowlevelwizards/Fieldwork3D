import test from 'node:test';
import assert from 'node:assert/strict';
import {WARDROBE_SLOTS} from '../src/operator-wardrobe-data.ts';
import {studioCameraFocus,studioFocusEasing,clampStudioCameraZoom,
 STUDIO_FULL_FIT,STUDIO_MIN_ZOOM,STUDIO_MAX_ZOOM}
 from '../src/operator-studio-camera-focus.ts';

test('all fourteen customization slots have stable, finite body part focus framing',()=>{
 assert.equal(WARDROBE_SLOTS.length,14);
 for(const slot of WARDROBE_SLOTS){
  const spec=studioCameraFocus(slot);
  assert.ok(Number.isFinite(spec.targetY),slot);
  assert.ok(Number.isFinite(spec.zoom),slot);
  assert.ok(spec.targetY>=0&&spec.targetY<=50,slot);
  assert.ok(spec.zoom>=STUDIO_MIN_ZOOM&&spec.zoom<=STUDIO_MAX_ZOOM,slot);
 }
});
test('changing head, torso, belt, legs and boots actually moves/zooms the inspection target',()=>{
 const head=studioCameraFocus('headwear');
 const eyes=studioCameraFocus('eyewear');
 const torso=studioCameraFocus('top');
 const rig=studioCameraFocus('rigStyle');
 const legs=studioCameraFocus('trousers');
 const knees=studioCameraFocus('knees');
 const feet=studioCameraFocus('footwear');
 assert.ok(eyes.targetY>=head.targetY-1);
 assert.ok(eyes.zoom>torso.zoom,'eyes zoom closer than uniform');
 assert.ok(torso.targetY>rig.targetY);
 assert.ok(rig.targetY>legs.targetY);
 assert.ok(legs.targetY>knees.targetY);
 assert.ok(knees.targetY>feet.targetY);
 assert.ok(feet.zoom>legs.zoom,'boots deserve a close-up');
 assert.equal(studioCameraFocus('packStyle').side,'back');
 assert.equal(studioCameraFocus('facewear').side,'retain');
 assert.ok(STUDIO_FULL_FIT.zoom<eyes.zoom);
});
test('animated transitions are bounded; touch/pinch zoom clamps without altering presets',()=>{
 assert.equal(studioFocusEasing(0),0);
 assert.equal(studioFocusEasing(1),1);
 assert.equal(studioFocusEasing(.5),.5);
 assert.equal(studioFocusEasing(-30),0);
 assert.equal(studioFocusEasing(200),1);
 assert.equal(clampStudioCameraZoom(-1),STUDIO_MIN_ZOOM);
 assert.equal(clampStudioCameraZoom(999),STUDIO_MAX_ZOOM);
 assert.equal(clampStudioCameraZoom(NaN),1);
 assert.equal(clampStudioCameraZoom(2.15),2.15);
});
