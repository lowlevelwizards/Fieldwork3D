import test from 'node:test';
import assert from 'node:assert/strict';
import {circulationReservations,overlapsCirculationReservation}
 from '../src/worldgen/circulation-reservations.ts';
import {generateSite} from '../src/breach-site.ts';
import {auditSite} from '../src/breach-site-audit.ts';
test('room entrances reserve a real in-room approach',()=>{
 const site={rooms:[{id:'A',purpose:'sales',kind:'room',x:0,y:0,w:200,h:150,tone:0}],
 doors:[{id:'D1',a:{x:0,y:55},b:{x:0,y:103}},
        {id:'D2',a:{x:200,y:55},b:{x:200,y:103}}],openings:[]};
 const reserve=circulationReservations(site);
 assert.ok(reserve.some(x=>x.kind==='door-approach'));
 assert.ok(reserve.some(x=>x.kind==='through-route'));
 assert.ok(overlapsCirculationReservation(
  {x:40,y:79,w:22,h:25},reserve,'A'));
 assert.equal(overlapsCirculationReservation(
  {x:46,y:15,w:10,h:10},reserve,'A'),false);
 assert.equal(overlapsCirculationReservation(
  {x:40,y:79,w:22,h:25},reserve,'B'),false);
});
test('bedrooms preserve doorway approaches without artificial through corridors',()=>{
 const site={rooms:[{id:'B',purpose:'bedroom',kind:'room',x:0,y:0,w:150,h:120,tone:0}],
 doors:[{id:'D',a:{x:0,y:30},b:{x:0,y:78}}],openings:[]};
 const lanes=circulationReservations(site);
 assert.equal(lanes.filter(x=>x.kind==='through-route').length,0);
 assert.equal(lanes.filter(x=>x.kind==='door-approach').length,1);
});
test('real generated sites retain a reachable main objective',()=>{
 const site=generateSite(4,'small'),audit=auditSite(site);
 assert.ok(!audit.errors.some(e=>e.includes('objective unreachable')));
});
