import test from 'node:test';
import assert from 'node:assert/strict';
import {aimTargetHasDirection} from '../src/breach-aim-target.ts';
import {targetPlacementAllowed} from '../src/ui/tactical-target-placement.ts';
import {newSession,team,planAim,planWatch,retargetActiveWatch}
 from '../src/breach-game.ts';

const bounds={minX:-120,minY:90,maxX:1020,maxY:960};
test('aim markers ignore traversal bounds; physical targets use live site bounds',()=>{
 assert.ok(targetPlacementAllowed({x:-300,y:700},'aim',bounds));
 assert.ok(targetPlacementAllowed({x:950,y:900},'physical',bounds),
   'sites larger than the legacy 640 x 740 surface remain usable');
 assert.ok(targetPlacementAllowed({x:-100,y:95},'physical',bounds),
   'sites may also start at negative coordinates');
 assert.equal(targetPlacementAllowed({x:1100,y:900},'physical',bounds),false);
 assert.equal(targetPlacementAllowed(null,'aim',bounds),false);
 assert.equal(targetPlacementAllowed({x:NaN,y:120},'aim',bounds),false);
 assert.equal(targetPlacementAllowed({x:Infinity,y:120},'physical',bounds),false);
});
test('LOOK/WATCH require a direction, not an arbitrary two-unit exclusion',()=>{
 const from={x:200,y:200};
 assert.equal(aimTargetHasDirection(from,from),false);
 assert.equal(aimTargetHasDirection(from,{x:200.1,y:200}),false);
 assert.ok(aimTargetHasDirection(from,{x:200.25,y:200}));
 assert.ok(aimTargetHasDirection(from,{x:-100,y:1200}));
 assert.equal(aimTargetHasDirection(from,{x:Infinity,y:201}),false);
});
test('real aim orders accept near distinct points and far points off-site',()=>{
 const s=newSession(),a=team(s)[0],p={...a.p};
 assert.ok(planAim(s,a.id,'free',{x:p.x+.25,y:p.y},undefined,'look','here'));
 assert.ok(planWatch(s,a.id,{x:p.x-200,y:p.y+900},undefined,'here'));
 const prior=a.plan.length;
 assert.equal(planWatch(s,a.id,p,undefined,'here'),false,
   'coincident aim has no defined heading and must not mutate the plan');
 assert.equal(a.plan.length,prior);
 a.aimInstruction={mode:'track',point:{x:p.x+10,y:p.y}};
 assert.ok(retargetActiveWatch(s,a.id,{x:p.x+.25,y:p.y}));
 assert.deepEqual(a.aimInstruction.point,{x:p.x+.25,y:p.y});
 assert.equal(retargetActiveWatch(s,a.id,p),false);
});
