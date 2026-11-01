import test from 'node:test';
import assert from 'node:assert/strict';
import {planRearServiceMarks} from '../src/worldgen/rear-service-program.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
const zone={id:'rear-property',kind:'service',x:240,y:310,w:260,h:106};
test('real rear service yards reserve a central route and organize work edges',()=>{
 const m=planRearServiceMarks([zone]);
 for(const k of ['clear-route','loading-zone','waste-collection','maintenance-bay'])
  assert.ok(m.some(v=>v.kind===k),k);
 for(const v of m){
  assert.ok(v.x-v.width/2>=zone.x-zone.w/2);
  assert.ok(v.x+v.width/2<=zone.x+zone.w/2);
  assert.ok(v.y-v.depth/2>=zone.y-zone.h/2);
  assert.ok(v.y+v.depth/2<=zone.y+zone.h/2);
 }
 assert.deepEqual(m,planRearServiceMarks([zone]));
});
test('non-industrial yards, tiny pads and gardens do not receive loading paint',()=>{
 assert.deepEqual(planRearServiceMarks([
  {...zone,kind:'yard'}, {...zone,kind:'garden'},
  {...zone,id:'small',w:35,h:35}]),[]);
});
test('live exterior surface pipeline renders service program without collision changes',()=>{
 const site={exteriorZones:[zone],doors:[],entrySide:'south'};
 const m=planPropertySurfaces(site);
 assert.ok(m.some(x=>x.kind==='clear-route'));
 assert.ok(m.some(x=>x.kind==='loading-zone'));
 assert.deepEqual(m,planPropertySurfaces(site));
});
