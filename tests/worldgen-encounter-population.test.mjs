import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseHostileBudget} from '../src/worldgen/encounter-population.ts';
import {generateSite} from '../src/breach-site.ts';
test('population budget follows context and can reverse scale expectations',()=>{
 const site=(rooms,capacity,seed)=>({seed,archetype:'warehouse',
   rooms:Array.from({length:rooms},(_,i)=>({id:String(i),kind:'room',
     x:i*110,y:0,w:100,h:100,zoneId:String(i)})),
   identity:{capacity,activity:'normal'}});
 const small=site(4,3,23),large=site(16,7,23);
 assert.ok(chooseHostileBudget(small,{risk:3},'defensive')>
   chooseHostileBudget(large,{risk:1},'vacant'));
 assert.ok(chooseHostileBudget(large,{risk:3},'guarded')>=
   chooseHostileBudget(large,{risk:1},'guarded'));
 const samples=new Set(Array.from({length:80},(_,i)=>
   chooseHostileBudget({...small,seed:i+10},{risk:2},'hideout')));
 assert.ok(samples.size>=4);
});
test('reduced legacy counts keep session spawn arrays in sync',()=>{
 const a=generateSite(35,'small'),b=generateSite(35,'small');
 assert.deepEqual(a.enemies,b.enemies);
 assert.equal(a.enemyHeadings.length,a.enemies.length);
 assert.equal(a.encounter.actors.length,a.enemies.length);
 assert.ok(a.enemies.length>=2);
});
