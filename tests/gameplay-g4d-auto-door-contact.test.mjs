import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {autoDoorAtBodyContact} from '../src/breach-door.ts';
const door=(overrides={})=>({
 id:'D',a:{x:100,y:80},b:{x:148,y:80},
 open:false,openFraction:0,locked:false,kind:'hinged',...overrides
});
const from={x:116,y:89},attempt={x:116,y:87};
test('G4d: close physical body contact can find a missed closed leaf',()=>{
 const d=door();
 assert.equal(autoDoorAtBodyContact(from,attempt,[d]),d);
});
test('G4d: locked leaf remains locked; interaction authority is elsewhere',()=>{
 const d=door({locked:true});
 assert.equal(autoDoorAtBodyContact(from,attempt,[d]),d);
 assert.equal(d.locked,true);
 assert.equal(d.open,false);
});
test('G4d: no remote, receding or traversable leaf auto-opens',()=>{
 assert.equal(autoDoorAtBodyContact({x:10,y:10},{x:11,y:10},[door()]),undefined);
 assert.equal(autoDoorAtBodyContact(attempt,from,[door()]),undefined);
 assert.equal(autoDoorAtBodyContact(from,attempt,[door({open:true,openFraction:1})]),undefined);
});
test('G4d: real movement uses original crossing check plus physical fallback',()=>{
 const src=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.match(src,/autoDoorAtBodyContact\(a\.p,move,s\.doors\)/);
 assert.match(src,/doorInteraction\(\{target:doorAhead/);
});
