import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const main=read('breach-main.ts');
const world=read('breach-2d-world-renderer.ts');
const fog=read('breach-2d-visibility-renderer.ts');
const actors=read('breach-2d-actor-renderer.ts');
const routes=read('breach-2d-route-overlays.ts');
const projected=read('breach-2d-projected-overlays.ts');
const replay=read('breach-2d-replay-overlays.ts');
test('the 2D composition root retains original depth, intel and world order',()=>{
 const render=world.slice(world.indexOf('export function renderBreachTacticalWorldFrame('));
 assert.match(main,/renderBreachTacticalWorldFrame\(/);
 const sequence=[
  'world2D.terrain();','world2D.furniture();','world2D.renderGroundMarks();',
  'world2D.renderLightingMood2D();','world2D.renderWeaponLights2D();',
  'world2D.architecture();','fog2D.renderFog();','fog2D.renderPersonalGround();',
  'actor2D.missionMarkers();','route2D.paths();',
  'replay2D.renderReplayMovementHistory(false);',
  'actor2D.civilianSprite(a);','actor2D.sprite(a);',
  'actor2D.drawExecutionProblem(a,false);','actor2D.contacts();',
  'replay2D.renderReplayGhosts(false);','replay2D.renderReplayBallistics(false);',
  'replay2D.renderReplayFollowMarker(false);','actor2D.endMessage();'
 ];
 let index=-1;
 for(const entry of sequence){
   const next=render.indexOf(entry);
   assert.ok(next>index,'missing or reordered draw step: '+entry);
   index=next;
 }
 assert.match(render,/if\(stage\.isReplayBodycamActive\(\)\)/);
 assert.ok(render.indexOf('draw.clearRect(0,0,cssW,cssH);')<
   render.indexOf('projected2D.renderProjectedPlans();return;'));
});
test('world, fog, actors and overlays have distinct ownership',()=>{
 assert.match(world,/function architecture\(\)/);
 assert.match(world,/function renderWeaponLights2D\(\)/);
 assert.match(world,/function renderGroundMarks\(\)/);
 assert.match(fog,/paintFogMask\(/);
 assert.match(fog,/renderPersonalGround:renderReplayPersonalGround/);
 assert.match(fog,/invalidate:\(\)=>\{fogStamp=-1;\}/);
 assert.match(actors,/function civilianSprite\(/);
 assert.match(actors,/function sprite\(/);
 assert.match(routes,/function paths\(\)/);
 assert.match(projected,/function renderProjectedPlans\(\)/);
 assert.match(replay,/function renderReplayBallistics\(/);
 for(const name of ['function terrain(', 'function architecture(',
   'function renderProjectedPlans(', 'function sprite(', 'function paths(']){
   assert.ok(!main.includes(name),'renderer remains in main: '+name);
 }
});
test('3D tactical overlay preserves historical visibility and route projection',()=>{
 assert.match(projected,/replayActorDisclosed\(/);
 assert.match(projected,/doorVisibility\(/);
 assert.match(projected,/projectedRouteCache\.beginFrame\(/);
 assert.match(projected,/replay2D\.renderReplayBallistics\(true\)/);
 assert.match(routes,/activeWatchTarget\(/);
 assert.match(routes,/displayRouteCache\.get\(/);
 assert.match(replay,/historicalShotVisible\(/);
 assert.match(fog,/replayKnowledge\.personalGround\.at\(/);
});
