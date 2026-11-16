import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newSession,setFirePolicy} from '../src/breach-game.ts';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {DEFAULT_TRAINING_CONFIG} from '../src/training/training-courses.ts';
import {trainingTargetProgress} from '../src/training/training-targets.ts';

test('target-fire placement retains real ballistic hit authority',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  buildTrainingSite({...DEFAULT_TRAINING_CONFIG}));
 const target=s.coverState.find(c=>c.fixture==='target-plate');
 const shooter=s.operators.find(a=>a.id==='rook');
 assert.ok(target&&shooter);
 assert.equal(setFirePolicy(s,'rook','suppress',undefined,
  {x:target.x,y:target.y}),true);
 assert.deepEqual(shooter.suppressPoint,{x:target.x,y:target.y});
 // Setting an aim order is not a fabricated projectile or a scored strike.
 assert.equal(trainingTargetProgress(s).hits,0);
 assert.equal(trainingTargetProgress(s).shots,0);
});

test('training affordance uses existing suppression placement and rejects non-planning',async()=>{
 const screen=await readFile(new URL('../src/ui/breach-training-screen.ts',import.meta.url),'utf8');
 const main=await readFile(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(screen,/button\('TARGET FIRE'/);
 assert.match(screen,/onArmTargetFire:\(\)=>boolean/);
 assert.match(screen,/targetFireButton\.disabled=s\.phase!=='planning'/);
 assert.match(main,/onArmTargetFire:\(\)=>\{/);
 assert.match(main,/state\.phase!=='planning'/);
 assert.match(main,/targeting\.armSuppress\(\)/);
 assert.match(main,/REAL HITS COUNT/);
});

test('mobile training panel remains scrollable and quick actions stay tappable',async()=>{
 const css=await readFile(new URL('../src/ui/breach-training.css',import.meta.url),'utf8');
 assert.match(css,/max-height:calc\(100dvh/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/overflow-x:auto/);
 assert.match(css,/min-height:40px;flex:0 0 auto/);
});
