import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localFixtureObservation} from '../src/breach-ai-contextual-observation.ts';
import {armedPrecontactStyle,idleLifeAt} from '../src/breach-idle-life.ts';
const p=(x,y)=>({x,y});
const rooms=[{x:0,y:0,w:120,h:120},{x:130,y:0,w:120,h:120}];
test('R5.5 grounded inspection selects real fixtures within the same room',()=>{
 const cover=[{x:75,y:65,fixture:'shelf'},
 {x:150,y:65,fixture:'shelf'},{x:45,y:30,fixture:'chair'}];
 assert.deepEqual(localFixtureObservation(p(40,65),cover,rooms),p(75,65));
 assert.equal(localFixtureObservation(p(115,100),[cover[1]],rooms),null);
 assert.equal(localFixtureObservation(p(270,60),cover,rooms),null);
});
test('R5.5 inspection is small existing armed visual expression, never fake tooling',()=>{
 const actor={side:'red',activity:'inspecting',alert:'idle',
 velocity:0,aim:0,health:4,surrendered:false,reloading:false,interacting:false};
 const pose=armedPrecontactStyle(actor);
 assert.equal(pose,'observe');
 assert.ok(idleLifeAt(5,7,{speed:0,precontact:pose}).headDip>0);
 assert.equal(armedPrecontactStyle({...actor,alert:'engaging'}),undefined);
 assert.equal(armedPrecontactStyle({...actor,velocity:20}),undefined);
});
test('R5.5 real journeys and fixture glances reuse authoritative motor and pose',()=>{
 const source=readFileSync(new URL('../src/breach-enemy-decision-controller.ts',import.meta.url),'utf8');
 assert.match(source,/localFixtureObservation\(a\.p,world\.cover,s\.site\?\.rooms\?\?\[\]\)/);
 assert.match(source,/a\.watch=fixture/);
 assert.match(source,/approach\(a,target,dt,s,\.52\)/);
 const activities=readFileSync(new URL('../src/worldgen/encounter-activities.ts',import.meta.url),'utf8');
 assert.match(activities,/activity='inspecting'/);
});
