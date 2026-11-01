import test from 'node:test';
import assert from 'node:assert/strict';
import {relatedFurniturePositions} from '../src/worldgen/room-composition.ts';
import {furnishRooms} from '../src/worldgen/room-furnishing.ts';
import {generateSite} from '../src/breach-site.ts';

test('one functional zone can anchor its next cell around an earlier sofa',()=>{
 const nextCell={id:'second',zoneId:'living-zone',kind:'room',
  purpose:'living',x:125,y:0,w:150,h:220};
 const earlierSofa={fixture:'sofa',x:95,y:110,w:65,h:28};
 const points=relatedFurniturePositions(nextCell,'coffee-table',30,24,[earlierSofa]);
 assert.ok(points.length>0);
 assert.ok(points.some(p=>p.x>125&&p.x<275));
 assert.deepEqual(points,relatedFurniturePositions(nextCell,'coffee-table',30,24,[earlierSofa]));
});
test('activity groups are intentional rather than always rotated north',()=>{
 const waiting={id:'wait',kind:'room',purpose:'waiting',x:0,y:0,w:240,h:180};
 const chair={fixture:'chair',x:90,y:70,w:30,h:24};
 const seats=relatedFurniturePositions(waiting,'chair',30,24,[chair]);
 assert.ok(seats.some(p=>p.y===chair.y&&p.x>chair.x));
 const exam={id:'exam',kind:'room',purpose:'exam',x:0,y:0,w:250,h:190};
 const bed={fixture:'exam-bed',x:120,y:80,w:62,h:31};
 const carts=relatedFurniturePositions(exam,'instrument-cart',30,24,[bed]);
 assert.ok(carts.length>=1);
 const living={id:'living',kind:'room',purpose:'living',x:0,y:0,w:240,h:200};
 const sofa={fixture:'sofa',x:115,y:95,w:65,h:28};
 assert.ok(relatedFurniturePositions(living,'armchair',30,24,[sofa]).length>=2);
});
test('connected furnishing keeps deterministic, unaltered physical dimensions',()=>{
 const site={seed:29,rooms:[
  {id:'A',zoneId:'L',x:0,y:0,w:150,h:190,kind:'room',purpose:'living',tone:0},
  {id:'B',zoneId:'L',x:150,y:0,w:150,h:190,kind:'room',purpose:'living',tone:0}],
  cover:[],doors:[],openings:[],spawn:[],enemies:[],
  objective:{x:-100,y:-100},extract:{x:-100,y:-100}};
 const a=furnishRooms(site,29),b=furnishRooms(site,29);
 assert.deepEqual(a.cover,b.cover);
 for(const o of a.cover){
  assert.ok(site.rooms.some(r=>o.x-o.w/2>=r.x&&o.x+o.w/2<=r.x+r.w&&
   o.y-o.h/2>=r.y&&o.y+o.h/2<=r.y+r.h),o.fixture);
 }
 for(const seed of [3,14]){
  const generated=generateSite(seed,'small');
  assert.deepEqual(generated.cover,generateSite(seed,'small').cover);
 }
});
