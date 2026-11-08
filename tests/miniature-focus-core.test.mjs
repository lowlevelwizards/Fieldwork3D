import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedMiniatureFocus,initialMiniatureFocusMode,miniatureFocusDecision}
 from '../src/rendering/miniature-focus-config.ts';
import {tiltShiftCoverage,nextReplayTiltShiftCenter}
 from '../src/rendering/miniature-focus-mask.ts';
const decision=(patch={})=>miniatureFocusDecision({
 mode:'subtle',view:'tactical',quality:'balanced',
 protectedRegionValid:true,capable:true,gesturesActive:false,...patch
});
test('Subtle default, persistent preference, URL override, Strong mode',()=>{
 assert.equal(requestedMiniatureFocus(null),'subtle');
 assert.equal(initialMiniatureFocusMode(null,'off'),'off');
 assert.equal(initialMiniatureFocusMode('strong','off'),'strong');
 assert.equal(initialMiniatureFocusMode(null,'replay'),'replay');
 assert.equal(initialMiniatureFocusMode(null,'garbage'),'off');
});
test('Gestures do NOT turn the frame effect off; unsafe view presets still do',()=>{
 assert.equal(decision({gesturesActive:true}).active,true);
 for(const view of ['top','floor-plan','bodycam'])
  assert.equal(decision({view}).active,false,view);
 for(const patch of [{mode:'off'},{quality:'performance'},
   {capable:false},{protectedRegionValid:false},
   {mode:'replay',view:'tactical'}])
  assert.equal(decision(patch).active,false,JSON.stringify(patch));
 assert.equal(decision({mode:'strong'}).strength,1*0+.94);
 assert.equal(decision({view:'director'}).centerY,.54);
 assert.equal(decision({mode:'replay',view:'director'}).active,true);
});
test('Both top and bottom blur, entire sharp center band is untouched',()=>{
 const c=.56,inner=.15,outer=.34;
 for(const y of [.42,.55,.69])
  assert.equal(tiltShiftCoverage(y,c,inner,outer),0);
 assert.equal(tiltShiftCoverage(0,c,inner,outer),1);
 assert.equal(tiltShiftCoverage(1,c,inner,outer),1);
 assert.ok(tiltShiftCoverage(.23,c,inner,outer)>0);
 assert.ok(tiltShiftCoverage(.23,c,inner,outer)<1);
 assert.equal(tiltShiftCoverage(NaN,c,inner,outer),0);
});
test('Replay follow is stable with deadzone, bounded and framerate-aware',()=>{
 assert.equal(nextReplayTiltShiftCenter(.54,.60,.016),.54);
 assert.ok(nextReplayTiltShiftCenter(.54,.82,.10)>.54);
 assert.ok(nextReplayTiltShiftCenter(.54,.82,.10)<.68);
 assert.equal(nextReplayTiltShiftCenter(.54,.70,0),.54);
 let c=.54;for(let n=0;n<180;n++)c=nextReplayTiltShiftCenter(c,.95,1/60);
 assert.ok(c<=.68&&c>.60);
});
