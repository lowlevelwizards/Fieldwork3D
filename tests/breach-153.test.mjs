import test from 'node:test';
import assert from 'node:assert/strict';
import {acousticDistance,heardIntensity}
 from '../src/breach-acoustics.ts';
import {readFileSync} from 'node:fs';
const a={x:10,y:50},b={x:90,y:50};
test('153: a closed door muffles, open door passes more sound',()=>{
 const door={id:'DOOR',a:{x:50,y:38},b:{x:50,y:62},
   open:false,openedAt:0,openFraction:0};
 const closed=acousticDistance(a,b,[door],[]);
 const opened=acousticDistance(a,b,[{...door,open:true,openFraction:1}],[]);
 assert.ok(closed>opened+40);
 assert.ok(heardIntensity(a,b,120,[door],[])<
   heardIntensity(a,b,120,[{...door,open:true,openFraction:1}],[]));
});
test('153: opaque walls attenuate without granting omniscient hearing',()=>{
 const walls=[{a:{x:50,y:0},b:{x:50,y:100}}];
 const clear=acousticDistance(a,b,[],[]);
 const blocked=acousticDistance(a,b,[],walls);
 assert.ok(blocked>=clear+90);
 assert.equal(heardIntensity(a,b,100,[],walls),0);
});
test('153: acoustic model is deterministic across repeated calls',()=>{
 const walls=[{a:{x:50,y:0},b:{x:50,y:42}},
   {a:{x:50,y:58},b:{x:50,y:100}}];
 const door={id:'PORTAL',a:{x:50,y:42},b:{x:50,y:58},
   open:true,openedAt:0,openFraction:1};
 const v=acousticDistance(a,b,[door],walls);
 for(let i=0;i<25;i++)assert.equal(
   acousticDistance(a,b,[door],walls),v);
 assert.ok(Number.isFinite(v));
});
test('153: audible source has positional sound, not enemy map disclosure',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(main,/createStereoPanner/);
 assert.match(main,/heardIntensity\(shot.start,listener/);
 const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.match(game,/lastNoiseExaminedAt/);
 assert.match(game,/acousticDistance\(newest.p,a.p/);
});