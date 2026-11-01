import test from 'node:test';
import assert from 'node:assert/strict';
import {planEnvironmentalWear} from '../src/worldgen/environment-wear.ts';

test('industrial wear attaches to machinery rather than the room centre',()=>{
 const site={seed:11,archetype:'garage',condition:'busy',
  rooms:[{id:'r1',kind:'room',purpose:'bay',x:0,y:0,w:250,h:200}],
  cover:[{fixture:'vehicle-lift',x:130,y:96,w:114,h:65}],doors:[]};
 const marks=planEnvironmentalWear(site);
 assert.ok(marks.length>0);
 assert.ok(marks.some(m=>['oil','grease','rust'].includes(m.kind)));
 assert.ok(marks.some(m=>Math.abs(m.x-130)<35&&Math.abs(m.y-96)<35));
 assert.deepEqual(marks,planEnvironmentalWear(site));
});
