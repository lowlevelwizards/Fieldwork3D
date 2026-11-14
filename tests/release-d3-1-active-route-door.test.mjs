import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doorBlocksSegment} from '../src/breach-core.ts';
import {autoDoorAtBodyContact} from '../src/breach-door.ts';
const p=(x,y)=>({x,y});
const d={id:'DETOUR',a:p(100,100),b:p(150,100),
 kind:'hinged',hinge:'a',swing:-1,open:false,openFraction:0};
test('D3.1: indirect authored goal cannot commandeer an active legal detour leg',()=>{
 const from=p(125,90),leg=p(95,90),goal=p(125,150);
 assert.equal(doorBlocksSegment(d,{a:from,b:goal}),true);
 assert.equal(doorBlocksSegment(d,{a:from,b:leg}),false);
 const src=readFileSync(new URL('../src/breach-motor-door.ts',import.meta.url),'utf8');
 assert.match(src,/if\(!doorBlocksSegment\(door,\{a:a\.p,b:next\}\)\)continue;/);
 assert.doesNotMatch(src,/doorBlocksSegment\(door,\{a:a\.p,b:p\}\)/);
});
test('D3.1: genuine local contact still chooses the same existing fallback',()=>{
 const door={...d,a:p(100,80),b:p(148,80)};
 const from=p(116,89),forward=p(116,87);
 assert.equal(autoDoorAtBodyContact(from,forward,[door]),door);
 assert.equal(autoDoorAtBodyContact(from,p(116,90),[door]),undefined);
});
