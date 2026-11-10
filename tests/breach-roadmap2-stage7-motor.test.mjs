/** Roadmap 2 Stage 7: architecture ownership, with the actual saved
 * deterministic gameplay tests kept in the critical/focused CI suites. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('breach-game delegates all physical approach movement to one motor',()=>{
 const game=source('breach-game.ts');
 const motor=source('breach-actor-motor.ts');
 assert.match(game,/return advanceActorMotor\(a,p,dt,s,motorHooks,speedScale\)/);
 assert.match(game,/advanceMotorTraversal\(a,s,dt,motorHooks\)/);
 const motion=source('breach-simulation-motion-phase.ts');
 assert.match(game,/advanceSimulationMotion\(s,h,origins,motionSimulationPhasePort\)/);
 assert.match(motion,/motorTraversalWorld\(s,a\)/);
 assert.doesNotMatch(game,/function tickTraversal\(/);
 assert.doesNotMatch(game,/function tryAutoClearClutter\(/);
 assert.doesNotMatch(game,/function desiredTraverse\(/);
 assert.doesNotMatch(game,/function approach\([\s\S]{0,400}pressDoorOnBodyAttempt/);
 assert.match(motor,/prepareMotorTraversal\(/);
 assert.match(motor,/prepareMotorRoute\(/);
 assert.match(motor,/negotiateMotorPassage\(/);
 assert.match(motor,/handleMotorDoor\(/);
 assert.match(motor,/resolveMotorCollision\(/);
});
test('one side-effect port retains session ownership and no rendering authority',()=>{
 const motor=source('breach-actor-motor.ts');
 const port=source('breach-motor-contract.ts');
 const game=source('breach-game.ts');
 for(const name of ['notify','hear','battleEvent','cachedEnemyRoute',
   'knownShoveCrossing','ensurePassageSchedule']){
   assert.match(port,new RegExp('\\b'+name+':'));
   assert.ok(game.includes('const motorHooks:ActorMotorHooks='));
 }
 for(const path of ['breach-motor-route.ts','breach-motor-passage.ts',
  'breach-motor-door.ts','breach-motor-collision.ts',
  'breach-motor-traversal.ts','breach-motor-clutter.ts','breach-actor-motor.ts']){
   const body=source(path);
   assert.doesNotMatch(body,/\b(?:document|window|requestAnimationFrame|WebGLRenderer)\s*\./,
    path+' cannot own browser state');
   assert.doesNotMatch(body,/from ['"](?:\.\/)?breach-3d/);
   assert.doesNotMatch(body,/from ['"]three(?:\/|['"])/);
   assert.doesNotMatch(body,/stepSession\(/);
   assert.doesNotMatch(body,/\.plan\.splice\(|\.plan\.push\(|\.plan\.shift\(/,
    path+' cannot edit authored orders');
 }
 assert.doesNotMatch(motor,/setInterval|setTimeout|performance\.now/);
});
test('passage, door, squeeze and recovery are separated without hidden owners',()=>{
 const passage=source('breach-motor-passage.ts');
 const door=source('breach-motor-door.ts');
 const collision=source('breach-motor-collision.ts');
 const route=source('breach-motor-route.ts');
 const traversal=source('breach-motor-traversal.ts');
 assert.match(passage,/passageDeadlockRetreatTarget/);
 assert.match(passage,/passageWait\(/);
 assert.match(door,/canAutoOpenEnRoute/);
 assert.match(door,/doorWouldStrikeActors/);
 assert.match(collision,/sweptProfileClear/);
 assert.match(collision,/glideAlongStaticWall/);
 assert.match(collision,/recoverNormalLane/);
 assert.match(collision,/recoveryAction/);
 assert.match(route,/routeRetrySeconds/);
 assert.match(route,/hooks\.knownShoveCrossing/);
 assert.match(traversal,/traversalStepClear/);
 assert.match(traversal,/traversalRetreating/);
 assert.match(traversal,/manipulateWindow/);
});
