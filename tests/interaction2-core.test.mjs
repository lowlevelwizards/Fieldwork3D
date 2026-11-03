import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preferSelectedHit,shouldAppendStrokePoint,
  tacticalHitProfile} from '../src/ui/touch-hit-targets.ts';
import {placeContextMenu,pathOverlapsRect} from '../src/breach-context-placement.ts';
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
test('selected waypoint retains ownership within a small distance margin',()=>{
  const hits=[{owner:'moss',distancePx:12,id:1},
    {owner:'rook',distancePx:16,id:2}];
  assert.equal(preferSelectedHit(hits,'rook')?.id,2);
  assert.equal(preferSelectedHit(hits,'vale')?.id,1);
  assert.equal(preferSelectedHit(hits,'rook',2)?.id,1);
  assert.equal(preferSelectedHit([],'rook'),null);
});
test('stroke sampling and hit sizes are screen-space, not world zoom dependent',()=>{
  assert.equal(shouldAppendStrokePoint({x:10,y:10},{x:20,y:10}),false);
  assert.equal(shouldAppendStrokePoint({x:10,y:10},{x:23,y:10}),true);
  assert.ok(tacticalHitProfile('touch').waypoint>tacticalHitProfile('mouse').waypoint);
  assert.match(main,/!\(state.phase==='planning'&&p.wasUnit\)/);
  assert.match(main,/p.mode='cameraPan';panX\+=dx;panY\+=dy;layout\(\)/);
  assert.match(main,/worldToScreen\(a\.p,viewMode==='plan2d'\?0:24\)/);
  assert.match(main,/shouldAppendStrokePoint\(worldToScreen/);
});
test('only one command long-press controller remains; failed targeting can retry',()=>{
  assert.doesNotMatch(main,/contextHoldTimer/);
  assert.match(main,/installTouchCommandHelp\(button\)/);
  assert.match(main,/if\(accepted\)tacticalFeedback\.emit\(p\.moved\?'command':'select'/);
  assert.match(main,/if\(committed\)looking=false/);
  assert.match(main,/p.mode==='targetPreview'\|\|p.mode==='undecided'/);
  assert.match(main,/if\(looking\|\|flashMode\|\|firePlacement\|\|evacMode\)/);
  assert.doesNotMatch(main,/case 'ctxReleaseWatch'/);
  assert.match(main,/if\(\!accepted\)rejectAt\(pt,'INVALID SUPPRESSION POINT'\)/);
});
test('unchanged palette keeps its position; existing pocket is an explicit candidate',()=>{
  const source=readFileSync(new URL('../src/breach-context-placement.ts',import.meta.url),'utf8');
  assert.match(main,/placementKey===lastPlacementKey/);
  assert.match(main,/contextPointerIds\.size>0/);
  assert.match(main,/displayRouteCache\.get\(previous,waypoint\.p,/);
  assert.match(source,/preferredPosition\?\.x\?\?xMin/);
  const prior={x:20,y:120},anchor={x:200,y:300};
  const pos=placeContextMenu({anchor,width:120,height:120,
    viewportWidth:410,top:70,bottom:680,preferredPosition:prior});
  assert.ok(pos.x>=8&&pos.x+120<=402);
  assert.ok(pos.y>=70&&pos.y+120<=680);
  assert.equal(pathOverlapsRect({a:{x:0,y:300},b:{x:410,y:300}},
    {x:160,y:260,w:120,h:80}),true);
});
test('on-map states are armed, accepted or rejected without conflating them',()=>{
  assert.match(main,/tacticalFeedback\.emit\('armed',/);
  assert.match(main,/tacticalFeedback\.emit\('cancel',/);
  assert.match(main,/if\(!accepted\)rejectAt\(pt,'WATCH TARGET UNAVAILABLE'\)/);
});
