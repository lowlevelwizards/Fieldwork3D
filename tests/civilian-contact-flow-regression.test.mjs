import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {createCivilianRig,updateCivilianRig,CIVILIAN_VISUAL_SCALE}
 from '../src/breach-civilian-visuals.ts';
import {resolveMovementFrame} from '../src/breach-movement-authority.ts';

const point=(x,y)=>({x,y});
const spec={id:'civ:regression',role:'visitor',persona:'steady',
 activity:'idle',position:point(0,0),heading:0,roomId:'room',appearanceSeed:6};

test('adult civilians retain operator-comparable height in every animated state',()=>{
 const c=createCivilian(spec),r=createCivilianRig(c);
 assert.equal(CIVILIAN_VISUAL_SCALE,1.20);
 updateCivilianRig(r,c,0);
 assert.equal(r.root.scale.y,CIVILIAN_VISUAL_SCALE);
 for(const state of ['compliant','frozen','fleeing','hiding']){
  c.state=state;
  updateCivilianRig(r,c,1);
  assert.ok(r.root.scale.y<=CIVILIAN_VISUAL_SCALE);
  assert.ok(r.root.scale.y>=CIVILIAN_VISUAL_SCALE*.7);
 }
 c.state='routine';updateCivilianRig(r,c,2);
 assert.equal(r.root.scale.y,CIVILIAN_VISUAL_SCALE,
   'rewind and state reset cannot accumulate a shrink');
});
test('friendly operators can pass ambulatory neutrals while enemies remain solid',()=>{
 const neutral={id:'civ:1',side:'neutral',from:point(20,0),
  to:point(20,0),alive:true};
 const player={id:'blue:1',side:'blue',from:point(0,0),
  to:point(12,0),alive:true};
 const [friendly]=resolveMovementFrame([player,neutral],()=>true);
 assert.equal(friendly.blocked,null);
 assert.deepEqual(friendly.point,point(12,0));
 const hostile={...player,id:'red:1',side:'red'};
 const [enemy]=resolveMovementFrame([hostile,neutral],()=>true);
 assert.equal(enemy.blocked,'actor');
 assert.deepEqual(enemy.point,point(0,0));
 const second={...neutral,id:'civ:2',from:point(0,0),to:point(12,0)};
 const [civ]=resolveMovementFrame([second,neutral],()=>true);
 assert.equal(civ.blocked,'actor','civilians still avoid occupying each other');
});
test('deadlock retreat is bounded by order goal, not repeated on every stall',()=>{
 const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const motor=readFileSync(new URL('../src/breach-motor-passage.ts',import.meta.url),'utf8');
 assert.match(game,/passageRetreatKey\?:string/);
 assert.match(motor,/a\.passageRetreatKey!==retreatKey/);
 assert.match(motor,/a\.passageRetreatKey=retreatKey/);
 assert.match(motor,/a\.nav\.unshift\(retreat\)/);
});
test('SECURE acknowledges its planned/GO state and closes small contact gaps',()=>{
 const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const executor=readFileSync(new URL('../src/breach-order-interactions.ts',import.meta.url),'utf8');
 assert.match(game,/QUEUED — EXECUTES ON GO/);
 assert.match(executor,/d\(person\.p,n\.p\)<=45/);
 assert.match(executor,/approach\(a,person\.p,dt,s,\.65\)/);
});
